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
    policy_seeds, AuditRecord, POLICY_LEN, Policy, PolicyRegistryIx,
};

use crate::{evaluate_at, register_policy, revoke, PolicyError};

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

const ERR_INVALID_IX: u32 = 20;
const ERR_ACCOUNTS: u32 = 21;
const ERR_PDA: u32 = 22;
const ERR_INIT: u32 = 23;
const ERR_CLOCK: u32 = 24;

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

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let ix = PolicyRegistryIx::decode(instruction_data).ok_or(err(ERR_INVALID_IX))?;
    match ix {
        PolicyRegistryIx::RegisterPolicy(args) => process_register(program_id, accounts, args),
        PolicyRegistryIx::Evaluate(args) => process_evaluate(accounts, args),
        PolicyRegistryIx::Revoke => process_revoke(accounts),
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
    accounts: &[AccountInfo],
    args: zeta_interface::EvaluateArgs,
) -> ProgramResult {
    let iter = &mut accounts.iter();
    let policy_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let line_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let agent_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;
    let clock_ai = next_account_info(iter).map_err(|_| err(ERR_ACCOUNTS))?;

    let policy = Policy::unpack(&policy_ai.try_borrow_data()?).ok_or(err(ERR_INIT))?;
    let (slot, now_unix) = read_clock(&clock_ai.try_borrow_data()?)?;
    let (denial, audit) = evaluate_at(
        &policy,
        pubkey_bytes(policy_ai.key),
        pubkey_bytes(line_ai.key),
        pubkey_bytes(agent_ai.key),
        args,
        now_unix,
        slot,
    );
    emit_audit(&audit);
    set_return_data(&[denial.as_u8()]);
    if denial.is_allow() {
        Ok(())
    } else {
        Err(ProgramError::Custom(denial.program_error_code()))
    }
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
        let clock = Pubkey::new_from_array([3; 32]);
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
        let clock = Pubkey::new_from_array([3; 32]);
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
        let clock = Pubkey::new_from_array([3; 32]);
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
}
