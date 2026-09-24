//! Seven-step Phase-1 spine against real processors (host AccountInfo).
//! Not on-chain / not BPF — do not claim explorer links from this test.
//!
//! 1 create_pool → 2 deposit → 3 register_policy → 4 open_line →
//! 5 allow draw → 6 deny over-cap → 7 revoke → deny → repay.

use credit_vault::process_instruction as vault_process;
use policy_registry::process_instruction as policy_process;
use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey,
};
use zeta_interface::{
    line_seeds, policy_seeds, pool_seeds, CreditLine, CreditVaultIx, Denial, DrawArgs,
    OpenLineArgs, Policy, Pool, RegisterPolicyArgs, RepayArgs, CREDIT_LINE_LEN, POLICY_LEN,
    POOL_LEN,
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

#[test]
fn seven_step_demo_path_processors() {
    let vault_pid = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
    let policy_pid = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);

    let authority = Pubkey::new_from_array([1; 32]);
    let mint = Pubkey::new_from_array([2; 32]);
    let vault_ata = Pubkey::new_from_array([3; 32]);
    let agent = Pubkey::new_from_array([9; 32]);
    let payee = Pubkey::new_from_array([8; 32]);
    let clock = Pubkey::new_from_array([11; 32]);

    let auth_b = authority.to_bytes();
    let mint_b = mint.to_bytes();
    let (pool_pda, _) =
        Pubkey::find_program_address(&pool_seeds(&auth_b, &mint_b), &vault_pid);

    let seed = 1u64;
    let seed_b = seed.to_le_bytes();
    let (policy_pda, _) =
        Pubkey::find_program_address(&policy_seeds(&auth_b, &seed_b), &policy_pid);

    let pool_key = pool_pda.to_bytes();
    let agent_b = agent.to_bytes();
    let (line_pda, _) =
        Pubkey::find_program_address(&line_seeds(&pool_key, &agent_b), &vault_pid);

    let mut pool_data = [0u8; POOL_LEN];
    let mut policy_data = [0u8; POLICY_LEN];
    let mut line_data = [0u8; CREDIT_LINE_LEN];

    // 1. create_pool
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut d0 = [];
        let mut d1 = [];
        let mut d3 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, true, &mut l0, &mut d0, &vault_pid),
                account(&mint, false, false, &mut l1, &mut d1, &vault_pid),
                account(&pool_pda, false, true, &mut l2, &mut pool_data, &vault_pid),
                account(&vault_ata, false, false, &mut l3, &mut d3, &vault_pid),
            ],
            &CreditVaultIx::CreatePool.encode(),
        )
        .unwrap();
        assert_eq!(Pool::unpack(&pool_data).unwrap().deposited, 0);
    }

    // 2. deposit (accounting only)
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut d0 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
            ],
            &CreditVaultIx::Deposit { amount: 10_000 }.encode(),
        )
        .unwrap();
        assert_eq!(Pool::unpack(&pool_data).unwrap().deposited, 10_000);
    }

    // 3. register_policy
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut d0 = [];
        policy_process(
            &policy_pid,
            &[
                account(&authority, true, true, &mut l0, &mut d0, &policy_pid),
                account(&policy_pda, false, true, &mut l1, &mut policy_data, &policy_pid),
            ],
            &zeta_interface::PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
                seed,
                per_call_cap: 500,
                expires_at: 0,
            })
            .encode(),
        )
        .unwrap();
        let p = Policy::unpack(&policy_data).unwrap();
        assert_eq!(p.per_call_cap, 500);
        assert!(!p.revoked);
    }

    // 4. open_line
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut d0 = [];
        let mut d3 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &vault_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
            ],
            &CreditVaultIx::OpenLine(OpenLineArgs { limit: 2_000 }).encode(),
        )
        .unwrap();
        let line = CreditLine::unpack(&line_data).unwrap();
        assert_eq!(line.limit, 2_000);
        assert_eq!(line.agent, agent.to_bytes());
        assert_eq!(line.policy, policy_pda.to_bytes());
    }

    let draw_ok = DrawArgs {
        amount: 400,
        salt: 1,
        grace_period: 60,
        open_slot: 10,
    };

    // 5. allow draw
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &vault_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(draw_ok).encode(),
        )
        .unwrap();
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 400);
        assert_eq!(Pool::unpack(&pool_data).unwrap().outstanding, 400);
    }

    // 6. deny over per-call cap
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &vault_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 501,
                salt: 2,
                grace_period: 60,
                open_slot: 10,
            })
            .encode(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            ProgramError::Custom(Denial::PerCallCap.program_error_code())
        );
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 400);
        assert_eq!(Pool::unpack(&pool_data).unwrap().outstanding, 400);
    }

    // 7. revoke → next draw denied
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut d0 = [];
        policy_process(
            &policy_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &policy_pid),
                account(&policy_pda, false, true, &mut l1, &mut policy_data, &policy_pid),
            ],
            &zeta_interface::PolicyRegistryIx::Revoke.encode(),
        )
        .unwrap();
        assert!(Policy::unpack(&policy_data).unwrap().revoked);

        let mut clock_data = clock_bytes(10, 1);
        let mut a0 = 1u64;
        let mut a1 = 1u64;
        let mut a2 = 1u64;
        let mut a3 = 1u64;
        let mut a4 = 1u64;
        let mut a5 = 1u64;
        let mut a6 = 1u64;
        let mut e0 = [];
        let mut e4 = [];
        let mut e5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut a0, &mut e0, &vault_pid),
                account(&pool_pda, false, true, &mut a1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut a2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut a3, &mut policy_data, &vault_pid),
                account(&payee, false, false, &mut a4, &mut e4, &vault_pid),
                account(&agent, true, false, &mut a5, &mut e5, &vault_pid),
                account(&clock, false, false, &mut a6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 100,
                salt: 3,
                grace_period: 60,
                open_slot: 10,
            })
            .encode(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            ProgramError::Custom(Denial::Revoked.program_error_code())
        );
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 400);
    }

    // repay the allowed draw
    {
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut d0 = [];
        vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
            ],
            &CreditVaultIx::Repay(RepayArgs {
                reserved_this_draw: 400,
                settled: 120,
            })
            .encode(),
        )
        .unwrap();
        let line = CreditLine::unpack(&line_data).unwrap();
        let pool = Pool::unpack(&pool_data).unwrap();
        assert_eq!(line.drawn, 120);
        assert_eq!(line.reserved, 0);
        assert_eq!(pool.outstanding, 0);
        assert_eq!(pool.deposited, 9_880);
    }
}
