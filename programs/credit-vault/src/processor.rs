//! On-chain Credit Vault. `draw` evaluates first; deny never reserves.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    log::sol_log_data,
    program::{invoke, invoke_signed, set_return_data},
    program_error::ProgramError,
    pubkey::Pubkey,
};
use zeta_interface::{
    encode_payment_channels_open, ids, line_seeds, open_slot_is_recent, pool_seeds, usage_seeds,
    AuditRecord, CreditLine, CreditVaultIx, DrawArgs, DrawChannelSpec, LineUsage, OpenLineArgs,
    PaymentChannelsOpenAccounts, Policy, PolicyAcl, Pool, RepayArgs,
    ACCOUNT_DISCRIMINATOR_LINE_USAGE, CREDIT_LINE_LEN, LINE_USAGE_LEN,
    PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT, POOL_LEN,
};

use crate::{
    create_pool, deposit, evaluate_draw, open_line_with_keys, pda::ensure_pda_account, repay,
    reserve_draw, VaultError,
};

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

const ERR_INVALID_IX: u32 = 20;
const ERR_ACCOUNTS: u32 = 21;
const ERR_PDA: u32 = 22;
const ERR_INIT: u32 = 23;
const ERR_CLOCK: u32 = 24;
const ERR_SLOT: u32 = 25;
const ERR_MISMATCH: u32 = 26;
const ERR_ACL: u32 = 27;
const ERR_POLICY_OWNER: u32 = 28;

fn policy_registry_id() -> Pubkey {
    Pubkey::new_from_array(ids::POLICY_REGISTRY_ID)
}

fn resolve_acl_allows(
    policy: &Policy,
    policy_key: &Pubkey,
    acl_ai: Option<&AccountInfo>,
    recipient: [u8; 32],
    category: u16,
) -> Result<Option<bool>, ProgramError> {
    if policy.acl_version == 0 {
        return Ok(None);
    }
    let acl_ai = acl_ai.ok_or_else(|| err(ERR_ACL))?;
    let registry = policy_registry_id();
    if acl_ai.owner != &registry {
        return Err(err(ERR_ACL));
    }
    let acl = PolicyAcl::unpack(&acl_ai.try_borrow_data()?).ok_or(err(ERR_ACL))?;
    if acl.policy != pubkey_bytes(policy_key) {
        return Err(err(ERR_ACL));
    }
    Ok(Some(acl.allows(&recipient, category)))
}

fn err(code: u32) -> ProgramError {
    ProgramError::Custom(code)
}

fn from_vault(e: VaultError) -> ProgramError {
    match e {
        VaultError::Unauthorized => err(1),
        VaultError::InsufficientLiquidity => err(2),
        VaultError::LineOverLimit => err(3),
        VaultError::PolicyDenied(d) => ProgramError::Custom(d.program_error_code()),
        VaultError::BadRepay => err(4),
        VaultError::DrawSpec(_) => err(5),
        VaultError::UnderwritingDenied => err(6),
        VaultError::Reentrancy => err(7),
    }
}

fn require_unlocked(pool: &Pool) -> Result<(), ProgramError> {
    if pool.reentrancy_locked() {
        Err(from_vault(VaultError::Reentrancy))
    } else {
        Ok(())
    }
}

fn payment_channels_id() -> Pubkey {
    Pubkey::new_from_array(ids::PAYMENT_CHANNELS_ID)
}

fn pubkey_bytes(key: &Pubkey) -> [u8; 32] {
    key.to_bytes()
}

fn emit_audit(audit: &AuditRecord) {
    let packed = audit.pack();
    sol_log_data(&[&packed]);
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (ix, extra) = CreditVaultIx::decode(instruction_data).ok_or(err(ERR_INVALID_IX))?;
    match ix {
        CreditVaultIx::CreatePool => process_create_pool(program_id, accounts),
        CreditVaultIx::Deposit { amount } => process_deposit(accounts, amount),
        CreditVaultIx::OpenLine(args) => process_open_line(program_id, accounts, args),
        CreditVaultIx::Draw(args) => process_draw(program_id, accounts, args, extra),
        CreditVaultIx::Repay(args) => process_repay(accounts, args),
    }
}

fn process_create_pool(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let mint = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let pool_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let vault_ata = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let system_ai = next_account_info(iter).ok();
    if !authority.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    let authority_bytes = pubkey_bytes(authority.key);
    let mint_bytes = pubkey_bytes(mint.key);
    let seeds = pool_seeds(&authority_bytes, &mint_bytes);
    let (expected, bump) = Pubkey::find_program_address(&seeds, program_id);
    if expected != *pool_ai.key {
        return Err(err(ERR_PDA));
    }
    ensure_pda_account(
        program_id,
        authority,
        pool_ai,
        system_ai,
        POOL_LEN,
        &seeds,
        bump,
    )?;
    let mut data = pool_ai.try_borrow_mut_data()?;
    if data.len() < POOL_LEN {
        return Err(err(ERR_ACCOUNTS));
    }
    if data[..8] != [0u8; 8] {
        return Err(err(ERR_INIT));
    }
    let pool = create_pool(authority_bytes, mint_bytes, pubkey_bytes(vault_ata.key), bump);
    data[..POOL_LEN].copy_from_slice(&pool.pack());
    Ok(())
}

fn process_deposit(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    if accounts.len() < 2 {
        return Err(err(ERR_ACCOUNTS));
    }
    let authority = &accounts[0];
    let pool_ai = &accounts[1];
    if !authority.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    let mut pool = Pool::unpack(&pool_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    require_unlocked(&pool)?;
    deposit(&mut pool, pubkey_bytes(authority.key), amount).map_err(from_vault)?;

    if accounts.len() >= 5 {
        let source = &accounts[2];
        let dest = &accounts[3];
        let token_program = &accounts[4];
        if dest.key.to_bytes() != pool.vault_ata {
            return Err(err(ERR_MISMATCH));
        }
        let mut ix_data = Vec::with_capacity(9);
        ix_data.push(3); // SPL Token Transfer
        ix_data.extend_from_slice(&amount.to_le_bytes());
        let ix = Instruction {
            program_id: *token_program.key,
            accounts: vec![
                AccountMeta::new(*source.key, false),
                AccountMeta::new(*dest.key, false),
                AccountMeta::new_readonly(*authority.key, true),
            ],
            data: ix_data,
        };
        invoke(
            &ix,
            &[source.clone(), dest.clone(), authority.clone(), token_program.clone()],
        )?;
    }

    pool_ai.try_borrow_mut_data()?[..POOL_LEN].copy_from_slice(&pool.pack());
    Ok(())
}

fn process_open_line(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: OpenLineArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let pool_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let agent = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let line_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let system_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let clock_ai = next_account_info(iter).map_err(|_| err(ERR_CLOCK))?;
    if !authority.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    if *clock_ai.key != solana_program::sysvar::clock::id() {
        return Err(err(ERR_CLOCK));
    }
    let pool = Pool::unpack(&pool_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    require_unlocked(&pool)?;
    if pubkey_bytes(authority.key) != pool.authority {
        return Err(from_vault(VaultError::Unauthorized));
    }
    if policy_ai.owner != &policy_registry_id() {
        return Err(err(ERR_POLICY_OWNER));
    }
    let policy = Policy::unpack(&policy_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    let now_unix = {
        let data = clock_ai.try_borrow_data()?;
        if data.len() < 40 {
            return Err(err(ERR_CLOCK));
        }
        i64::from_le_bytes(data[32..40].try_into().unwrap())
    };
    let pool_key = pubkey_bytes(pool_ai.key);
    let agent_key = pubkey_bytes(agent.key);
    let seeds = line_seeds(&pool_key, &agent_key);
    let (expected, bump) = Pubkey::find_program_address(&seeds, program_id);
    if expected != *line_ai.key {
        return Err(err(ERR_PDA));
    }
    ensure_pda_account(
        program_id,
        authority,
        line_ai,
        Some(system_ai),
        CREDIT_LINE_LEN,
        &seeds,
        bump,
    )?;
    let mut data = line_ai.try_borrow_mut_data()?;
    if data.len() < CREDIT_LINE_LEN {
        return Err(err(ERR_ACCOUNTS));
    }
    if data[..8] != [0u8; 8] {
        return Err(err(ERR_INIT));
    }
    let line = open_line_with_keys(
        &pool,
        pool_key,
        agent_key,
        pubkey_bytes(policy_ai.key),
        &policy,
        args,
        bump,
        now_unix,
    )
    .map_err(from_vault)?;
    data[..CREDIT_LINE_LEN].copy_from_slice(&line.pack());
    Ok(())
}

fn process_draw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: DrawArgs,
    extra: &[u8],
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let agent = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let pool_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let line_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let payee = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let rent_payer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let clock_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    if !agent.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    if !rent_payer.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    if *clock_ai.key != solana_program::sysvar::clock::id() {
        return Err(err(ERR_CLOCK));
    }
    if policy_ai.owner != &policy_registry_id() {
        return Err(err(ERR_POLICY_OWNER));
    }

    let (slot, now_unix) = {
        let data = clock_ai.try_borrow_data()?;
        if data.len() < 40 {
            return Err(err(ERR_CLOCK));
        }
        (
            u64::from_le_bytes(data[0..8].try_into().unwrap()),
            i64::from_le_bytes(data[32..40].try_into().unwrap()),
        )
    };
    if !open_slot_is_recent(args.open_slot, slot) {
        return Err(err(ERR_SLOT));
    }

    let policy = Policy::unpack(&policy_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    let mut pool = Pool::unpack(&pool_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    require_unlocked(&pool)?;
    let mut line = CreditLine::unpack(&line_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    if pubkey_bytes(agent.key) != line.agent {
        return Err(from_vault(VaultError::Unauthorized));
    }
    if pubkey_bytes(pool_ai.key) != line.pool || pubkey_bytes(policy_ai.key) != line.policy {
        return Err(err(ERR_MISMATCH));
    }

    let acl_ai = if policy.acl_version != 0 {
        Some(next_account_info(iter).map_err(|_| err(ERR_ACL))?)
    } else {
        None
    };
    let usage_ai = if policy.rolling_cap != 0 {
        Some(next_account_info(iter).map_err(|_| err(ERR_ACL))?)
    } else {
        None
    };
    let usage_system = if policy.rolling_cap != 0 {
        next_account_info(iter).ok()
    } else {
        None
    };

    let payee_bytes = pubkey_bytes(payee.key);
    let acl_allows = resolve_acl_allows(&policy, policy_ai.key, acl_ai, payee_bytes, args.category)?;

    let (rolling_spent, window_start) = if policy.rolling_cap != 0 {
        let usage_ai = usage_ai.ok_or_else(|| err(ERR_ACL))?;
        let data = usage_ai.try_borrow_data()?;
        if data.len() >= LINE_USAGE_LEN && data[..8] != [0u8; 8] {
            let usage = LineUsage::unpack(&data).ok_or(err(ERR_ACL))?;
            if usage.line != pubkey_bytes(line_ai.key) {
                return Err(err(ERR_ACL));
            }
            (usage.rolling_spent, usage.window_start)
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    let denial = evaluate_draw(
        &policy,
        payee_bytes,
        &args,
        now_unix,
        acl_allows,
        line.drawn,
        line.reserved,
        rolling_spent,
        window_start,
    );
    let audit = AuditRecord::new(
        pubkey_bytes(policy_ai.key),
        pubkey_bytes(line_ai.key),
        pubkey_bytes(agent.key),
        args.amount,
        denial,
        slot,
        now_unix,
    );
    emit_audit(&audit);
    if !denial.is_allow() {
        set_return_data(&[denial.as_u8()]);
        return Err(ProgramError::Custom(denial.program_error_code()));
    }

    let draw_amount = args.amount;
    let spec = reserve_draw(
        &mut pool,
        &mut line,
        pubkey_bytes(pool_ai.key),
        payee_bytes,
        pubkey_bytes(rent_payer.key),
        args,
    )
    .map_err(from_vault)?;

    {
        let mut pool_data = pool_ai.try_borrow_mut_data()?;
        pool_data[..POOL_LEN].copy_from_slice(&pool.pack());
        let mut line_data = line_ai.try_borrow_mut_data()?;
        line_data[..CREDIT_LINE_LEN].copy_from_slice(&line.pack());
    }

    if policy.rolling_cap != 0 {
        let usage_ai = usage_ai.ok_or_else(|| err(ERR_ACL))?;
        if !usage_ai.is_writable {
            return Err(err(ERR_ACCOUNTS));
        }
        let line_bytes = pubkey_bytes(line_ai.key);
        let seeds = usage_seeds(&line_bytes);
        let (expected, bump) = Pubkey::find_program_address(&seeds, program_id);
        if expected != *usage_ai.key {
            return Err(err(ERR_PDA));
        }
        ensure_pda_account(
            program_id,
            rent_payer,
            usage_ai,
            usage_system,
            LINE_USAGE_LEN,
            &seeds,
            bump,
        )?;
        let mut data = usage_ai.try_borrow_mut_data()?;
        let mut usage = if data[..8] == [0u8; 8] {
            LineUsage {
                discriminator: ACCOUNT_DISCRIMINATOR_LINE_USAGE,
                line: line_bytes,
                window_start: 0,
                rolling_spent: 0,
                bump,
                _pad: [0; 7],
            }
        } else {
            LineUsage::unpack(&data).ok_or(err(ERR_ACL))?
        };
        usage.apply_draw(draw_amount, now_unix, policy.rolling_window_secs);
        data[..LINE_USAGE_LEN].copy_from_slice(&usage.pack());
    }

    let open_data = encode_payment_channels_open(&spec, extra);
    set_return_data(&open_data);

    let rest: Vec<&AccountInfo> = iter.collect();
    if rest.len() >= 1 + PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT {
        pool.set_reentrancy_lock(true);
        pool_ai.try_borrow_mut_data()?[..POOL_LEN].copy_from_slice(&pool.pack());
        invoke_open_cpi(program_id, pool_ai, &pool, &spec, extra, &rest)?;
        pool.set_reentrancy_lock(false);
        pool_ai.try_borrow_mut_data()?[..POOL_LEN].copy_from_slice(&pool.pack());
    }

    Ok(())
}

fn invoke_open_cpi(
    program_id: &Pubkey,
    pool_ai: &AccountInfo,
    pool: &Pool,
    spec: &DrawChannelSpec,
    extra: &[u8],
    rest: &[&AccountInfo],
) -> ProgramResult {
    let channels_program = rest[0];
    if channels_program.key != &payment_channels_id() {
        return Err(err(ERR_MISMATCH));
    }
    let open_ais = &rest[1..1 + PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT];
    let accounts = PaymentChannelsOpenAccounts::from_spec(
        spec,
        pubkey_bytes(open_ais[5].key),
        pubkey_bytes(open_ais[7].key),
        pubkey_bytes(open_ais[8].key),
        pubkey_bytes(open_ais[9].key),
        pubkey_bytes(open_ais[10].key),
        pubkey_bytes(open_ais[11].key),
        pubkey_bytes(open_ais[12].key),
        pubkey_bytes(open_ais[13].key),
    );
    let wire_metas = accounts.metas();
    let metas: Vec<AccountMeta> = wire_metas
        .iter()
        .map(|m| AccountMeta {
            pubkey: Pubkey::new_from_array(m.pubkey),
            is_signer: m.is_signer,
            is_writable: m.is_writable,
        })
        .collect();
    let ix = Instruction {
        program_id: *channels_program.key,
        accounts: metas,
        data: encode_payment_channels_open(spec, extra),
    };
    let mut infos = Vec::with_capacity(1 + PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT);
    infos.push(channels_program.clone());
    for ai in open_ais {
        infos.push((*ai).clone());
    }
    let bump = [pool.bump];
    let seeds = [
        zeta_interface::POOL_SEED,
        pool.authority.as_slice(),
        pool.mint.as_slice(),
        bump.as_slice(),
    ];
    invoke_signed(&ix, &infos, &[&seeds])?;
    let _ = (program_id, pool_ai);
    Ok(())
}

fn process_repay(accounts: &[AccountInfo], args: RepayArgs) -> ProgramResult {
    let iter = &mut accounts.iter();
    let signer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let pool_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let line_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    if !signer.is_signer {
        return Err(from_vault(VaultError::Unauthorized));
    }
    let mut pool = Pool::unpack(&pool_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    require_unlocked(&pool)?;
    let mut line = CreditLine::unpack(&line_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    if line.pool != pubkey_bytes(pool_ai.key) {
        return Err(err(ERR_MISMATCH));
    }
    let sig = pubkey_bytes(signer.key);
    if sig != line.agent && sig != pool.authority {
        return Err(from_vault(VaultError::Unauthorized));
    }
    repay(&mut pool, &mut line, args).map_err(from_vault)?;
    pool_ai.try_borrow_mut_data()?[..POOL_LEN].copy_from_slice(&pool.pack());
    line_ai.try_borrow_mut_data()?[..CREDIT_LINE_LEN].copy_from_slice(&line.pack());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::pubkey::Pubkey;
    use zeta_interface::{
        ACCOUNT_DISCRIMINATOR_LINE, ACCOUNT_DISCRIMINATOR_POLICY, ACCOUNT_DISCRIMINATOR_POOL, Denial,
    };

    fn clock_bytes(slot: u64, unix: i64) -> [u8; 40] {
        let mut d = [0u8; 40];
        d[0..8].copy_from_slice(&slot.to_le_bytes());
        d[32..40].copy_from_slice(&unix.to_le_bytes());
        d
    }

    fn account<'a>(
        key: &'a Pubkey,
        is_signer: bool,
        is_writable: bool,
        lamports: &'a mut u64,
        data: &'a mut [u8],
        owner: &'a Pubkey,
    ) -> AccountInfo<'a> {
        AccountInfo::new(key, is_signer, is_writable, lamports, data, owner, false, 0)
    }

    fn policy_account(expires_at: i64, revoked: bool, cap: u64) -> Policy {
        Policy {
            discriminator: ACCOUNT_DISCRIMINATOR_POLICY,
            issuer: [1; 32],
            seed: 1,
            per_call_cap: cap,
            expires_at,
            rolling_cap: 0,
            total_cap: 0,
            acl_version: 0,
            revoked,
            bump: 255,
            rolling_window_secs: 0,
            _pad: [0; 8],
        }
    }

    #[allow(dead_code)]
    struct DrawHarness {
        program_id: Pubkey,
        authority: Pubkey,
        mint: Pubkey,
        vault_ata: Pubkey,
        agent: Pubkey,
        payee: Pubkey,
        rent_payer: Pubkey,
        clock: Pubkey,
        pool_pda: Pubkey,
        line_pda: Pubkey,
        policy_pk: Pubkey,
        policy_owner: Pubkey,
        pool: Pool,
        line: CreditLine,
        policy: Policy,
    }

    fn harness(expires_at: i64, revoked: bool, cap: u64, limit: u64) -> DrawHarness {
        let program_id = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
        let authority = Pubkey::new_from_array([1; 32]);
        let mint = Pubkey::new_from_array([2; 32]);
        let vault_ata = Pubkey::new_from_array([3; 32]);
        let agent = Pubkey::new_from_array([9; 32]);
        let payee = Pubkey::new_from_array([8; 32]);
        let rent_payer = agent;
        let clock = solana_program::sysvar::clock::id();
        let policy_pk = Pubkey::new_from_array([6; 32]);
        let policy_owner = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
        let authority_b = authority.to_bytes();
        let mint_b = mint.to_bytes();
        let (pool_pda, pool_bump) =
            Pubkey::find_program_address(&pool_seeds(&authority_b, &mint_b), &program_id);
        let mut pool = create_pool(authority_b, mint_b, vault_ata.to_bytes(), pool_bump);
        deposit(&mut pool, authority_b, 10_000).unwrap();
        let pool_key = pool_pda.to_bytes();
        let agent_b = agent.to_bytes();
        let (line_pda, line_bump) =
            Pubkey::find_program_address(&line_seeds(&pool_key, &agent_b), &program_id);
        let mut policy = policy_account(expires_at, false, cap);
        let line = open_line_with_keys(
            &pool,
            pool_key,
            agent_b,
            policy_pk.to_bytes(),
            &policy,
            OpenLineArgs { limit },
            line_bump,
            1,
        )
        .unwrap();
        policy.revoked = revoked;
        DrawHarness {
            program_id,
            authority,
            mint,
            vault_ata,
            agent,
            payee,
            rent_payer,
            clock,
            pool_pda,
            line_pda,
            policy_pk,
            policy_owner,
            pool,
            line,
            policy,
        }
    }

    fn run_draw(
        h: &mut DrawHarness,
        args: DrawArgs,
        slot: u64,
        now: i64,
    ) -> Result<(), ProgramError> {
        let mut pool_data = h.pool.pack();
        let mut line_data = h.line.pack();
        let mut policy_data = h.policy.pack();
        let mut clock_data = clock_bytes(slot, now);
        let mut agent_data = [];
        let mut payee_data = [];
        let mut rent_data = [];
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let ix = CreditVaultIx::Draw(args).encode();
        let result = process_instruction(
            &h.program_id,
            &[
                account(&h.agent, true, false, &mut l0, &mut agent_data, &h.program_id),
                account(&h.pool_pda, false, true, &mut l1, &mut pool_data, &h.program_id),
                account(&h.line_pda, false, true, &mut l2, &mut line_data, &h.program_id),
                account(
                    &h.policy_pk,
                    false,
                    false,
                    &mut l3,
                    &mut policy_data,
                    &h.policy_owner,
                ),
                account(&h.payee, false, false, &mut l4, &mut payee_data, &h.program_id),
                account(&h.rent_payer, true, false, &mut l5, &mut rent_data, &h.program_id),
                account(&h.clock, false, false, &mut l6, &mut clock_data, &h.program_id),
            ],
            &ix,
        );
        if result.is_ok() {
            h.pool = Pool::unpack(&pool_data).unwrap();
            h.line = CreditLine::unpack(&line_data).unwrap();
        } else {
            // deny must not persist a reserve even if the processor wrote (it should not)
            let pool_after = Pool::unpack(&pool_data).unwrap();
            let line_after = CreditLine::unpack(&line_data).unwrap();
            h.pool = pool_after;
            h.line = line_after;
        }
        result
    }

    #[test]
    fn processor_create_pool_bytes_roundtrip() {
        let program_id = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
        let authority = Pubkey::new_from_array([1; 32]);
        let mint = Pubkey::new_from_array([2; 32]);
        let vault_ata = Pubkey::new_from_array([3; 32]);
        let a = authority.to_bytes();
        let m = mint.to_bytes();
        let (pool_pda, bump) = Pubkey::find_program_address(&pool_seeds(&a, &m), &program_id);
        let mut pool_data = [0u8; POOL_LEN];
        let mut auth_data = [];
        let mut mint_data = [];
        let mut ata_data = [];
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        process_instruction(
            &program_id,
            &[
                account(&authority, true, true, &mut l0, &mut auth_data, &program_id),
                account(&mint, false, false, &mut l1, &mut mint_data, &program_id),
                account(&pool_pda, false, true, &mut l2, &mut pool_data, &program_id),
                account(&vault_ata, false, false, &mut l3, &mut ata_data, &program_id),
            ],
            &CreditVaultIx::CreatePool.encode(),
        )
        .unwrap();
        let pool = Pool::unpack(&pool_data).unwrap();
        assert_eq!(pool.discriminator, ACCOUNT_DISCRIMINATOR_POOL);
        assert_eq!(pool.bump, bump);
        assert_eq!(pool.deposited, 0);
        assert_eq!(pool.vault_ata, vault_ata.to_bytes());
    }

    #[test]
    fn p1_processor_no_overspend() {
        let mut h = harness(0, false, 500, 400);
        let args = DrawArgs {
            amount: 400,
            salt: 1,
            grace_period: 60,
            open_slot: 10,
            category: 0,
        };
        run_draw(&mut h, args, 10, 1).unwrap();
        assert_eq!(h.line.reserved, 400);
        assert_eq!(h.pool.outstanding, 400);
        let err = run_draw(&mut h, args, 10, 1).unwrap_err();
        assert_eq!(err, ProgramError::Custom(3)); // LineOverLimit
        assert_eq!(h.line.reserved, 400);
        assert_eq!(h.pool.outstanding, 400);
    }

    #[test]
    fn p2_processor_no_spend_after_expiry() {
        let mut h = harness(1_000, false, 500, 2_000);
        let err = run_draw(
            &mut h,
            DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            10,
            1_000,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::Expired.program_error_code()));
        assert_eq!(h.line.reserved, 0);
        assert_eq!(h.pool.outstanding, 0);
    }

    #[test]
    fn p3_processor_revoke_immediate() {
        let mut h = harness(0, true, 500, 2_000);
        let err = run_draw(
            &mut h,
            DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            10,
            1,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::Revoked.program_error_code()));
        assert_eq!(h.line.reserved, 0);
        assert_eq!(h.pool.outstanding, 0);
    }

    #[test]
    fn processor_deny_does_not_reserve() {
        let mut h = harness(0, false, 500, 2_000);
        let err = run_draw(
            &mut h,
            DrawArgs {
                amount: 501,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            10,
            1,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::PerCallCap.program_error_code()));
        assert_eq!(h.line.reserved, 0);
        assert_eq!(h.pool.outstanding, 0);
        assert_eq!(h.line.discriminator, ACCOUNT_DISCRIMINATOR_LINE);
    }

    #[test]
    fn processor_draw_allow_then_repay() {
        let mut h = harness(0, false, 500, 2_000);
        run_draw(
            &mut h,
            DrawArgs {
                amount: 400,
                salt: 7,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            10,
            1,
        )
        .unwrap();
        assert_eq!(h.line.reserved, 400);
        let mut pool_data = h.pool.pack();
        let mut line_data = h.line.pack();
        let mut agent_data = [];
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        process_instruction(
            &h.program_id,
            &[
                account(&h.agent, true, false, &mut l0, &mut agent_data, &h.program_id),
                account(&h.pool_pda, false, true, &mut l1, &mut pool_data, &h.program_id),
                account(&h.line_pda, false, true, &mut l2, &mut line_data, &h.program_id),
            ],
            &CreditVaultIx::Repay(RepayArgs {
                reserved_this_draw: 400,
                settled: 120,
            })
            .encode(),
        )
        .unwrap();
        let pool = Pool::unpack(&pool_data).unwrap();
        let line = CreditLine::unpack(&line_data).unwrap();
        assert_eq!(line.drawn, 120);
        assert_eq!(line.reserved, 0);
        assert_eq!(pool.outstanding, 0);
        assert_eq!(pool.deposited, 9_880);
    }

    #[test]
    fn processor_rejects_reentrancy_lock() {
        let mut h = harness(0, false, 500, 2_000);
        h.pool.set_reentrancy_lock(true);
        let err = run_draw(
            &mut h,
            DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            10,
            1,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(7));
        assert_eq!(h.line.reserved, 0);
        assert!(h.pool.reentrancy_locked());
    }
}
