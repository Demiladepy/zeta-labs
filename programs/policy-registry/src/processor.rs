//! On-chain entry for Policy Registry. Account bytes match `zeta-interface`.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    log::sol_log_data,
    program::set_return_data,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use zeta_interface::{
    acl_seeds, policy_seeds, AuditRecord, Policy, PolicyAcl, PolicyRegistryIx,
    ACCOUNT_DISCRIMINATOR_POLICY_ACL, POLICY_ACL_LEN, POLICY_ACL_MAX_RECIPIENTS, POLICY_LEN,
};

use crate::{evaluate_at, pda::ensure_pda_account, register_policy, revoke, PolicyError};

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

const ERR_INVALID_IX: u32 = 20;
const ERR_ACCOUNTS: u32 = 21;
const ERR_PDA: u32 = 22;
const ERR_INIT: u32 = 23;
const ERR_CLOCK: u32 = 24;
const ERR_ACL: u32 = 25;

fn err(code: u32) -> ProgramError {
    ProgramError::Custom(code)
}

fn from_policy(e: PolicyError) -> ProgramError {
    match e {
        PolicyError::Unauthorized => err(1),
        PolicyError::AlreadyRevoked => err(2),
        PolicyError::InvalidCap => err(3),
    }
}

pub fn read_clock(data: &[u8]) -> Result<(u64, i64), ProgramError> {
    if data.len() < 40 {
        return Err(err(ERR_CLOCK));
    }
    let slot = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let unix = i64::from_le_bytes(data[32..40].try_into().unwrap());
    Ok((slot, unix))
}

pub fn emit_audit(audit: &AuditRecord) {
    let packed = audit.pack();
    sol_log_data(&[&packed]);
}

fn pubkey_bytes(key: &Pubkey) -> [u8; 32] {
    key.to_bytes()
}

fn resolve_acl_allows(
    policy: &Policy,
    policy_key: &Pubkey,
    program_id: &Pubkey,
    acl_ai: Option<&AccountInfo>,
    recipient: [u8; 32],
    category: u16,
) -> Result<Option<bool>, ProgramError> {
    if policy.acl_version == 0 {
        return Ok(None);
    }
    let acl_ai = acl_ai.ok_or_else(|| err(ERR_ACL))?;
    if acl_ai.owner != program_id {
        return Err(err(ERR_ACL));
    }
    let acl = PolicyAcl::unpack(&acl_ai.try_borrow_data()?).ok_or(err(ERR_ACL))?;
    if acl.policy != pubkey_bytes(policy_key) {
        return Err(err(ERR_ACL));
    }
    Ok(Some(acl.allows(&recipient, category)))
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let ix = PolicyRegistryIx::decode(instruction_data).ok_or(err(ERR_INVALID_IX))?;
    match ix {
        PolicyRegistryIx::RegisterPolicy(args) => process_register(program_id, accounts, args),
        PolicyRegistryIx::Evaluate(args) => process_evaluate(program_id, accounts, args),
        PolicyRegistryIx::Revoke => process_revoke(accounts),
        PolicyRegistryIx::SetAcl(args) => process_set_acl(program_id, accounts, args),
        PolicyRegistryIx::SetCaps(args) => process_set_caps(accounts, args),
    }
}

fn process_register(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: zeta_interface::RegisterPolicyArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let issuer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let system_ai = next_account_info(iter).ok();
    if !issuer.is_signer {
        return Err(from_policy(PolicyError::Unauthorized));
    }
    if !policy_ai.is_writable {
        return Err(err(ERR_ACCOUNTS));
    }
    let seed = args.seed.to_le_bytes();
    let issuer_bytes = pubkey_bytes(issuer.key);
    let seeds = policy_seeds(&issuer_bytes, &seed);
    let (expected, bump) = Pubkey::find_program_address(&seeds, program_id);
    if expected != *policy_ai.key {
        return Err(err(ERR_PDA));
    }
    ensure_pda_account(
        program_id,
        issuer,
        policy_ai,
        system_ai,
        POLICY_LEN,
        &seeds,
        bump,
    )?;
    let mut data = policy_ai.try_borrow_mut_data()?;
    if data.len() < POLICY_LEN {
        return Err(err(ERR_ACCOUNTS));
    }
    if data[..8] != [0u8; 8] {
        return Err(err(ERR_INIT));
    }
    let policy = register_policy(issuer_bytes, bump, args).map_err(from_policy)?;
    data[..POLICY_LEN].copy_from_slice(&policy.pack());
    Ok(())
}

fn process_evaluate(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: zeta_interface::EvaluateArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let line_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let agent_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let clock_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;

    if *clock_ai.key != solana_program::sysvar::clock::id() {
        return Err(err(ERR_CLOCK));
    }
    if policy_ai.owner != program_id {
        return Err(err(ERR_INIT));
    }

    let policy = Policy::unpack(&policy_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    let (slot, now_unix) = read_clock(&clock_ai.try_borrow_data()?)?;

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

    let acl_allows = resolve_acl_allows(
        &policy,
        policy_ai.key,
        program_id,
        acl_ai,
        args.recipient,
        args.category,
    )?;

    let (line_drawn, line_reserved) = if policy.total_cap != 0 {
        let line = zeta_interface::CreditLine::unpack(&line_ai.try_borrow_data()?)
            .ok_or(err(ERR_INIT))?;
        (line.drawn, line.reserved)
    } else {
        (0, 0)
    };

    let (rolling_spent, window_start) = if policy.rolling_cap != 0 {
        let usage_ai = usage_ai.ok_or_else(|| err(ERR_ACL))?;
        let usage = zeta_interface::LineUsage::unpack(&usage_ai.try_borrow_data()?)
            .ok_or(err(ERR_ACL))?;
        if usage.line != pubkey_bytes(line_ai.key) {
            return Err(err(ERR_ACL));
        }
        (usage.rolling_spent, usage.window_start)
    } else {
        (0, 0)
    };

    let (denial, audit) = evaluate_at(
        &policy,
        pubkey_bytes(policy_ai.key),
        pubkey_bytes(line_ai.key),
        pubkey_bytes(agent_ai.key),
        args,
        now_unix,
        slot,
        acl_allows,
        line_drawn,
        line_reserved,
        rolling_spent,
        window_start,
    );
    emit_audit(&audit);
    set_return_data(&[denial.as_u8()]);
    if denial.is_allow() {
        Ok(())
    } else {
        Err(ProgramError::Custom(denial.program_error_code()))
    }
}

fn process_set_caps(
    accounts: &[AccountInfo],
    args: zeta_interface::SetCapsArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let issuer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    if !issuer.is_signer {
        return Err(from_policy(PolicyError::Unauthorized));
    }
    if !policy_ai.is_writable {
        return Err(err(ERR_ACCOUNTS));
    }
    if args.rolling_cap != 0 && args.rolling_window_secs == 0 {
        return Err(from_policy(PolicyError::InvalidCap));
    }
    let mut data = policy_ai.try_borrow_mut_data()?;
    let mut policy = Policy::unpack(&data).ok_or(err(ERR_INIT))?;
    if pubkey_bytes(issuer.key) != policy.issuer {
        return Err(from_policy(PolicyError::Unauthorized));
    }
    policy.rolling_cap = args.rolling_cap;
    policy.total_cap = args.total_cap;
    policy.rolling_window_secs = args.rolling_window_secs;
    data[..POLICY_LEN].copy_from_slice(&policy.pack());
    Ok(())
}

fn process_set_acl(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: zeta_interface::SetAclArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let issuer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let acl_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let system_ai = next_account_info(iter).ok();

    if !issuer.is_signer {
        return Err(from_policy(PolicyError::Unauthorized));
    }
    if !policy_ai.is_writable || !acl_ai.is_writable {
        return Err(err(ERR_ACCOUNTS));
    }
    if policy_ai.owner != program_id {
        return Err(err(ERR_INIT));
    }
    if args.recipient_count as usize > POLICY_ACL_MAX_RECIPIENTS {
        return Err(err(ERR_ACL));
    }

    let mut policy = Policy::unpack(&policy_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    if pubkey_bytes(issuer.key) != policy.issuer {
        return Err(from_policy(PolicyError::Unauthorized));
    }

    let policy_bytes = pubkey_bytes(policy_ai.key);
    let seeds = acl_seeds(&policy_bytes);
    let (expected, bump) = Pubkey::find_program_address(&seeds, program_id);
    if expected != *acl_ai.key {
        return Err(err(ERR_PDA));
    }
    ensure_pda_account(
        program_id,
        issuer,
        acl_ai,
        system_ai,
        POLICY_ACL_LEN,
        &seeds,
        bump,
    )?;

    let acl = PolicyAcl {
        discriminator: ACCOUNT_DISCRIMINATOR_POLICY_ACL,
        policy: policy_bytes,
        category_mask: args.category_mask,
        recipient_count: args.recipient_count,
        bump,
        _pad: [0; 2],
        recipients: args.recipients,
    };
    acl_ai.try_borrow_mut_data()?[..POLICY_ACL_LEN].copy_from_slice(&acl.pack());

    policy.acl_version = if policy.acl_version == 0 {
        1
    } else {
        policy.acl_version.saturating_add(1).max(1)
    };
    policy_ai.try_borrow_mut_data()?[..POLICY_LEN].copy_from_slice(&policy.pack());
    Ok(())
}

fn process_revoke(accounts: &[AccountInfo]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let issuer = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    if !issuer.is_signer {
        return Err(from_policy(PolicyError::Unauthorized));
    }
    let mut data = policy_ai.try_borrow_mut_data()?;
    let mut policy = Policy::unpack(&data).ok_or(err(ERR_INIT))?;
    revoke(&mut policy, pubkey_bytes(issuer.key)).map_err(from_policy)?;
    data[..POLICY_LEN].copy_from_slice(&policy.pack());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::pubkey::Pubkey;
    use zeta_interface::{
        Denial, EvaluateArgs, RegisterPolicyArgs, ACCOUNT_DISCRIMINATOR_POLICY, POLICY_IX_EVALUATE,
        POLICY_IX_REGISTER, POLICY_IX_REVOKE,
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

    fn setup_policy(
        program_id: &Pubkey,
        issuer: &Pubkey,
        seed: u64,
        cap: u64,
        expires_at: i64,
    ) -> (Pubkey, u8, Policy) {
        let seed_bytes = seed.to_le_bytes();
        let issuer_bytes = issuer.to_bytes();
        let (pda, bump) = Pubkey::find_program_address(&policy_seeds(&issuer_bytes, &seed_bytes), program_id);
        let policy = register_policy(
            issuer_bytes,
            bump,
            RegisterPolicyArgs {
                seed,
                per_call_cap: cap,
                expires_at,
            },
        )
        .unwrap();
        (pda, bump, policy)
    }

    #[test]
    fn processor_register_revoke_evaluate_bytes() {
        let program_id = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
        let issuer = Pubkey::new_from_array([7; 32]);
        let seed = 1u64;
        let seed_bytes = seed.to_le_bytes();
        let issuer_bytes = issuer.to_bytes();
        let (pda, _bump) =
            Pubkey::find_program_address(&policy_seeds(&issuer_bytes, &seed_bytes), &program_id);
        let owner = program_id;
        let mut issuer_lamports = 1;
        let mut policy_lamports = 1;
        let mut issuer_data = [];
        let mut policy_data = [0u8; POLICY_LEN];
        let ix = PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
            seed,
            per_call_cap: 50,
            expires_at: 0,
        })
        .encode();
        {
            let issuer_ai = account(&issuer, true, true, &mut issuer_lamports, &mut issuer_data, &owner);
            let policy_ai = account(&pda, false, true, &mut policy_lamports, &mut policy_data, &owner);
            process_instruction(&program_id, &[issuer_ai, policy_ai], &ix).unwrap();
        }
        let stored = Policy::unpack(&policy_data).unwrap();
        assert_eq!(stored.discriminator, ACCOUNT_DISCRIMINATOR_POLICY);
        assert_eq!(stored.per_call_cap, 50);
        assert!(!stored.revoked);

        {
            let mut issuer_data = [];
            let issuer_ai = account(&issuer, true, false, &mut issuer_lamports, &mut issuer_data, &owner);
            let policy_ai = account(&pda, false, true, &mut policy_lamports, &mut policy_data, &owner);
            process_instruction(&program_id, &[issuer_ai, policy_ai], &[POLICY_IX_REVOKE]).unwrap();
        }
        assert!(Policy::unpack(&policy_data).unwrap().revoked);

        let line = Pubkey::new_from_array([1; 32]);
        let agent = Pubkey::new_from_array([2; 32]);
        let clock = solana_program::sysvar::clock::id();
        let mut line_lamports = 1;
        let mut agent_lamports = 1;
        let mut clock_lamports = 1;
        let mut line_data = [];
        let mut agent_data = [];
        let mut clock_data = clock_bytes(9, 8);
        let ev = PolicyRegistryIx::Evaluate(EvaluateArgs {
            amount: 5,
            recipient: [0; 32],
            category: 0,
        })
        .encode();
        let policy_ai = account(&pda, false, false, &mut policy_lamports, &mut policy_data, &owner);
        let line_ai = account(&line, false, false, &mut line_lamports, &mut line_data, &owner);
        let agent_ai = account(&agent, false, false, &mut agent_lamports, &mut agent_data, &owner);
        let clock_ai = account(&clock, false, false, &mut clock_lamports, &mut clock_data, &owner);
        let err = process_instruction(
            &program_id,
            &[policy_ai, line_ai, agent_ai, clock_ai],
            &ev,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::Revoked.program_error_code()));
        let _ = (POLICY_IX_REGISTER, POLICY_IX_EVALUATE);
    }

    #[test]
    fn p2_processor_rejects_expired_without_mutating() {
        let program_id = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
        let issuer = Pubkey::new_from_array([7; 32]);
        let (pda, _, policy) = setup_policy(&program_id, &issuer, 2, 50, 1_000);
        let mut policy_data = policy.pack();
        let before = policy_data;
        let line = Pubkey::new_from_array([1; 32]);
        let agent = Pubkey::new_from_array([2; 32]);
        let clock = solana_program::sysvar::clock::id();
        let mut l1 = 1;
        let mut l2 = 1;
        let mut l3 = 1;
        let mut l4 = 1;
        let mut d1 = [];
        let mut d2 = [];
        let mut clock_data = clock_bytes(1, 1_000);
        let ev = PolicyRegistryIx::Evaluate(EvaluateArgs {
            amount: 10,
            recipient: [0; 32],
            category: 0,
        })
        .encode();
        let err = process_instruction(
            &program_id,
            &[
                account(&pda, false, false, &mut l1, &mut policy_data, &program_id),
                account(&line, false, false, &mut l2, &mut d1, &program_id),
                account(&agent, false, false, &mut l3, &mut d2, &program_id),
                account(&clock, false, false, &mut l4, &mut clock_data, &program_id),
            ],
            &ev,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::Expired.program_error_code()));
        assert_eq!(policy_data, before);
    }

    #[test]
    fn p3_processor_revoke_is_immediate() {
        let program_id = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
        let issuer = Pubkey::new_from_array([7; 32]);
        let (pda, _, mut policy) = setup_policy(&program_id, &issuer, 3, 50, 0);
        policy.revoked = true;
        let mut policy_data = policy.pack();
        let line = Pubkey::new_from_array([1; 32]);
        let agent = Pubkey::new_from_array([2; 32]);
        let clock = solana_program::sysvar::clock::id();
        let mut l1 = 1;
        let mut l2 = 1;
        let mut l3 = 1;
        let mut l4 = 1;
        let mut d1 = [];
        let mut d2 = [];
        let mut clock_data = clock_bytes(1, 1);
        let ev = PolicyRegistryIx::Evaluate(EvaluateArgs {
            amount: 10,
            recipient: [0; 32],
            category: 0,
        })
        .encode();
        let err = process_instruction(
            &program_id,
            &[
                account(&pda, false, false, &mut l1, &mut policy_data, &program_id),
                account(&line, false, false, &mut l2, &mut d1, &program_id),
                account(&agent, false, false, &mut l3, &mut d2, &program_id),
                account(&clock, false, false, &mut l4, &mut clock_data, &program_id),
            ],
            &ev,
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(Denial::Revoked.program_error_code()));
    }

    #[test]
    fn p4_set_acl_then_evaluate_allow_and_deny() {
        use zeta_interface::{acl_seeds, SetAclArgs, POLICY_ACL_LEN, POLICY_IX_SET_ACL};

        let program_id = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
        let issuer = Pubkey::new_from_array([7; 32]);
        let seed = 4u64;
        let seed_bytes = seed.to_le_bytes();
        let issuer_bytes = issuer.to_bytes();
        let (policy_pda, _) =
            Pubkey::find_program_address(&policy_seeds(&issuer_bytes, &seed_bytes), &program_id);
        let policy_bytes = policy_pda.to_bytes();
        let (acl_pda, _) = Pubkey::find_program_address(&acl_seeds(&policy_bytes), &program_id);

        let mut policy_data = [0u8; POLICY_LEN];
        let mut acl_data = [0u8; POLICY_ACL_LEN];
        {
            let mut issuer_lamports = 1;
            let mut policy_lamports = 1;
            let mut issuer_data = [];
            process_instruction(
                &program_id,
                &[
                    account(&issuer, true, true, &mut issuer_lamports, &mut issuer_data, &program_id),
                    account(
                        &policy_pda,
                        false,
                        true,
                        &mut policy_lamports,
                        &mut policy_data,
                        &program_id,
                    ),
                ],
                &PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
                    seed,
                    per_call_cap: 50,
                    expires_at: 0,
                })
                .encode(),
            )
            .unwrap();
        }

        let payee = [8u8; 32];
        let mut recipients = [[0u8; 32]; 8];
        recipients[0] = payee;
        {
            let mut issuer_lamports = 1;
            let mut policy_lamports = 1;
            let mut acl_lamports = 1;
            let mut issuer_data = [];
            process_instruction(
                &program_id,
                &[
                    account(&issuer, true, true, &mut issuer_lamports, &mut issuer_data, &program_id),
                    account(
                        &policy_pda,
                        false,
                        true,
                        &mut policy_lamports,
                        &mut policy_data,
                        &program_id,
                    ),
                    account(&acl_pda, false, true, &mut acl_lamports, &mut acl_data, &program_id),
                ],
                &PolicyRegistryIx::SetAcl(SetAclArgs {
                    category_mask: 1u32 << 3, // category 3
                    recipient_count: 1,
                    recipients,
                })
                .encode(),
            )
            .unwrap();
        }
        assert_eq!(Policy::unpack(&policy_data).unwrap().acl_version, 1);
        assert_eq!(
            PolicyAcl::unpack(&acl_data).unwrap().category_mask,
            1u32 << 3
        );
        let _ = POLICY_IX_SET_ACL;

        let line = Pubkey::new_from_array([1; 32]);
        let agent = Pubkey::new_from_array([2; 32]);
        let clock = solana_program::sysvar::clock::id();

        // allowlisted recipient + category
        {
            let mut l1 = 1;
            let mut l2 = 1;
            let mut l3 = 1;
            let mut l4 = 1;
            let mut l5 = 1;
            let mut d1 = [];
            let mut d2 = [];
            let mut clock_data = clock_bytes(1, 1);
            process_instruction(
                &program_id,
                &[
                    account(&policy_pda, false, false, &mut l1, &mut policy_data, &program_id),
                    account(&line, false, false, &mut l2, &mut d1, &program_id),
                    account(&agent, false, false, &mut l3, &mut d2, &program_id),
                    account(&clock, false, false, &mut l4, &mut clock_data, &program_id),
                    account(&acl_pda, false, false, &mut l5, &mut acl_data, &program_id),
                ],
                &PolicyRegistryIx::Evaluate(EvaluateArgs {
                    amount: 10,
                    recipient: payee,
                    category: 3,
                })
                .encode(),
            )
            .unwrap();
        }

        // wrong recipient → NotAllowlisted
        {
            let mut l1 = 1;
            let mut l2 = 1;
            let mut l3 = 1;
            let mut l4 = 1;
            let mut l5 = 1;
            let mut d1 = [];
            let mut d2 = [];
            let mut clock_data = clock_bytes(1, 1);
            let err = process_instruction(
                &program_id,
                &[
                    account(&policy_pda, false, false, &mut l1, &mut policy_data, &program_id),
                    account(&line, false, false, &mut l2, &mut d1, &program_id),
                    account(&agent, false, false, &mut l3, &mut d2, &program_id),
                    account(&clock, false, false, &mut l4, &mut clock_data, &program_id),
                    account(&acl_pda, false, false, &mut l5, &mut acl_data, &program_id),
                ],
                &PolicyRegistryIx::Evaluate(EvaluateArgs {
                    amount: 10,
                    recipient: [9; 32],
                    category: 3,
                })
                .encode(),
            )
            .unwrap_err();
            assert_eq!(
                err,
                ProgramError::Custom(Denial::NotAllowlisted.program_error_code())
            );
        }

        // wrong category → NotAllowlisted
        {
            let mut l1 = 1;
            let mut l2 = 1;
            let mut l3 = 1;
            let mut l4 = 1;
            let mut l5 = 1;
            let mut d1 = [];
            let mut d2 = [];
            let mut clock_data = clock_bytes(1, 1);
            let err = process_instruction(
                &program_id,
                &[
                    account(&policy_pda, false, false, &mut l1, &mut policy_data, &program_id),
                    account(&line, false, false, &mut l2, &mut d1, &program_id),
                    account(&agent, false, false, &mut l3, &mut d2, &program_id),
                    account(&clock, false, false, &mut l4, &mut clock_data, &program_id),
                    account(&acl_pda, false, false, &mut l5, &mut acl_data, &program_id),
                ],
                &PolicyRegistryIx::Evaluate(EvaluateArgs {
                    amount: 10,
                    recipient: payee,
                    category: 0,
                })
                .encode(),
            )
            .unwrap_err();
            assert_eq!(
                err,
                ProgramError::Custom(Denial::NotAllowlisted.program_error_code())
            );
        }
    }
}
