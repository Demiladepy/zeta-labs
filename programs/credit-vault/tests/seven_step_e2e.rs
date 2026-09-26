//! Seven-step Phase-1 spine against real processors (host AccountInfo).
//! Not on-chain / not BPF — do not claim explorer links from this test.
//!
//! 1 create_pool → 2 deposit → 3 register_policy → 4 open_line →
//! 5 allow draw → 6 deny over-cap → 7 revoke → deny → repay.
//! Plus P4 ACL allow/deny (no reserve on deny).

use credit_vault::process_instruction as vault_process;
use policy_registry::process_instruction as policy_process;
use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey, system_program,
};
use zeta_interface::{
    acl_seeds, line_seeds, policy_seeds, pool_seeds, CreditLine, CreditVaultIx, Denial, DrawArgs,
    OpenLineArgs, Policy, PolicyAcl, Pool, RegisterPolicyArgs, RepayArgs, SetAclArgs,
    CREDIT_LINE_LEN, POLICY_ACL_LEN, POLICY_LEN, POOL_LEN,
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
    let clock = solana_program::sysvar::clock::id();

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

    // 4. open_line (policy owned by Policy Registry)
    {
        let clock = solana_program::sysvar::clock::id();
        let system = system_program::id();
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut d0 = [];
        let mut d3 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &policy_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
                account(&system, false, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
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
        category: 0,
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
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
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
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 501,
                salt: 2,
                grace_period: 60,
                open_slot: 10,
                category: 0,
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
                account(&policy_pda, false, false, &mut a3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut a4, &mut e4, &vault_pid),
                account(&agent, true, false, &mut a5, &mut e5, &vault_pid),
                account(&clock, false, false, &mut a6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 100,
                salt: 3,
                grace_period: 60,
                open_slot: 10,
                category: 0,
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

#[test]
fn p4_acl_allow_and_deny_no_reserve() {
    let vault_pid = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
    let policy_pid = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);

    let authority = Pubkey::new_from_array([1; 32]);
    let mint = Pubkey::new_from_array([2; 32]);
    let vault_ata = Pubkey::new_from_array([3; 32]);
    let agent = Pubkey::new_from_array([9; 32]);
    let payee = Pubkey::new_from_array([8; 32]);
    let bad_payee = Pubkey::new_from_array([7; 32]);
    let clock = solana_program::sysvar::clock::id();

    let auth_b = authority.to_bytes();
    let mint_b = mint.to_bytes();
    let (pool_pda, _) =
        Pubkey::find_program_address(&pool_seeds(&auth_b, &mint_b), &vault_pid);

    let seed = 42u64;
    let seed_b = seed.to_le_bytes();
    let (policy_pda, _) =
        Pubkey::find_program_address(&policy_seeds(&auth_b, &seed_b), &policy_pid);
    let policy_bytes = policy_pda.to_bytes();
    let (acl_pda, _) = Pubkey::find_program_address(&acl_seeds(&policy_bytes), &policy_pid);

    let pool_key = pool_pda.to_bytes();
    let agent_b = agent.to_bytes();
    let (line_pda, _) =
        Pubkey::find_program_address(&line_seeds(&pool_key, &agent_b), &vault_pid);

    let mut pool_data = [0u8; POOL_LEN];
    let mut policy_data = [0u8; POLICY_LEN];
    let mut line_data = [0u8; CREDIT_LINE_LEN];
    let mut acl_data = [0u8; POLICY_ACL_LEN];

    // create_pool + deposit
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
        let mut a0 = 1u64;
        let mut a1 = 1u64;
        let mut e0 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut a0, &mut e0, &vault_pid),
                account(&pool_pda, false, true, &mut a1, &mut pool_data, &vault_pid),
            ],
            &CreditVaultIx::Deposit { amount: 10_000 }.encode(),
        )
        .unwrap();
    }

    // register_policy + set_acl (category 2, payee allowlisted)
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

        let mut recipients = [[0u8; 32]; 8];
        recipients[0] = payee.to_bytes();
        let mut i0 = 1u64;
        let mut i1 = 1u64;
        let mut i2 = 1u64;
        let mut id0 = [];
        policy_process(
            &policy_pid,
            &[
                account(&authority, true, true, &mut i0, &mut id0, &policy_pid),
                account(&policy_pda, false, true, &mut i1, &mut policy_data, &policy_pid),
                account(&acl_pda, false, true, &mut i2, &mut acl_data, &policy_pid),
            ],
            &zeta_interface::PolicyRegistryIx::SetAcl(SetAclArgs {
                category_mask: 1u32 << 2,
                recipient_count: 1,
                recipients,
            })
            .encode(),
        )
        .unwrap();
        assert_eq!(Policy::unpack(&policy_data).unwrap().acl_version, 1);
        assert!(PolicyAcl::unpack(&acl_data).unwrap().allows(&payee.to_bytes(), 2));
    }

    // open_line
    {
        let system = system_program::id();
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut d0 = [];
        let mut d3 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &policy_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
                account(&system, false, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::OpenLine(OpenLineArgs { limit: 2_000 }).encode(),
        )
        .unwrap();
    }

    // ACL deny (wrong payee) — no reserve
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut l7 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&bad_payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
                account(&acl_pda, false, false, &mut l7, &mut acl_data, &policy_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 2,
            })
            .encode(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            ProgramError::Custom(Denial::NotAllowlisted.program_error_code())
        );
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 0);
        assert_eq!(Pool::unpack(&pool_data).unwrap().outstanding, 0);
    }

    // ACL allow
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut l7 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
                account(&acl_pda, false, false, &mut l7, &mut acl_data, &policy_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 100,
                salt: 2,
                grace_period: 60,
                open_slot: 10,
                category: 2,
            })
            .encode(),
        )
        .unwrap();
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 100);
        assert_eq!(Pool::unpack(&pool_data).unwrap().outstanding, 100);
    }
}

#[test]
fn p5_total_cap_deny_and_rolling_meter() {
    use zeta_interface::{
        usage_seeds, LineUsage, SetCapsArgs, ACCOUNT_DISCRIMINATOR_LINE_USAGE, LINE_USAGE_LEN,
    };

    let vault_pid = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
    let policy_pid = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);

    let authority = Pubkey::new_from_array([1; 32]);
    let mint = Pubkey::new_from_array([2; 32]);
    let vault_ata = Pubkey::new_from_array([3; 32]);
    let agent = Pubkey::new_from_array([9; 32]);
    let payee = Pubkey::new_from_array([8; 32]);
    let clock = solana_program::sysvar::clock::id();

    let auth_b = authority.to_bytes();
    let mint_b = mint.to_bytes();
    let (pool_pda, _) =
        Pubkey::find_program_address(&pool_seeds(&auth_b, &mint_b), &vault_pid);

    let seed = 55u64;
    let seed_b = seed.to_le_bytes();
    let (policy_pda, _) =
        Pubkey::find_program_address(&policy_seeds(&auth_b, &seed_b), &policy_pid);

    let pool_key = pool_pda.to_bytes();
    let agent_b = agent.to_bytes();
    let (line_pda, _) =
        Pubkey::find_program_address(&line_seeds(&pool_key, &agent_b), &vault_pid);
    let line_bytes = line_pda.to_bytes();
    let (usage_pda, _) = Pubkey::find_program_address(&usage_seeds(&line_bytes), &vault_pid);

    let mut pool_data = [0u8; POOL_LEN];
    let mut policy_data = [0u8; POLICY_LEN];
    let mut line_data = [0u8; CREDIT_LINE_LEN];
    let mut usage_data = [0u8; LINE_USAGE_LEN];

    // create_pool + deposit
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
        let mut a0 = 1u64;
        let mut a1 = 1u64;
        let mut e0 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut a0, &mut e0, &vault_pid),
                account(&pool_pda, false, true, &mut a1, &mut pool_data, &vault_pid),
            ],
            &CreditVaultIx::Deposit { amount: 10_000 }.encode(),
        )
        .unwrap();
    }

    // register + set_caps (total 250, rolling 150 / 3600s)
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
        let mut i0 = 1u64;
        let mut i1 = 1u64;
        let mut id0 = [];
        policy_process(
            &policy_pid,
            &[
                account(&authority, true, false, &mut i0, &mut id0, &policy_pid),
                account(&policy_pda, false, true, &mut i1, &mut policy_data, &policy_pid),
            ],
            &zeta_interface::PolicyRegistryIx::SetCaps(SetCapsArgs {
                rolling_cap: 200,
                total_cap: 200,
                rolling_window_secs: 3_600,
            })
            .encode(),
        )
        .unwrap();
        let p = Policy::unpack(&policy_data).unwrap();
        assert_eq!(p.rolling_cap, 200);
        assert_eq!(p.total_cap, 200);
        assert_eq!(p.rolling_window_secs, 3_600);
    }

    // open_line
    {
        let system = system_program::id();
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut d0 = [];
        let mut d3 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &policy_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
                account(&system, false, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::OpenLine(OpenLineArgs { limit: 200 }).encode(),
        )
        .unwrap();
    }

    // rolling deny (amount 201 > rolling 200) — no reserve
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut l7 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, true, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
                account(&usage_pda, false, true, &mut l7, &mut usage_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 201,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            })
            .encode(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            ProgramError::Custom(Denial::RollingCap.program_error_code())
        );
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 0);
    }

    // allow 100 — updates usage meter
    {
        let mut clock_data = clock_bytes(10, 1);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut l7 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, true, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
                account(&usage_pda, false, true, &mut l7, &mut usage_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 100,
                salt: 2,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            })
            .encode(),
        )
        .unwrap();
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 100);
        let usage = LineUsage::unpack(&usage_data).unwrap();
        assert_eq!(usage.discriminator, ACCOUNT_DISCRIMINATOR_LINE_USAGE);
        assert_eq!(usage.rolling_spent, 100);
        assert_eq!(usage.window_start, 1);
    }

    // After window reset: amount 101 fits rolling (200) but exceeds total (100+101 > 200)
    {
        let mut clock_data = clock_bytes(10, 1 + 3_600);
        let mut l0 = 1u64;
        let mut l1 = 1u64;
        let mut l2 = 1u64;
        let mut l3 = 1u64;
        let mut l4 = 1u64;
        let mut l5 = 1u64;
        let mut l6 = 1u64;
        let mut l7 = 1u64;
        let mut d0 = [];
        let mut d4 = [];
        let mut d5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&agent, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, true, &mut l1, &mut pool_data, &vault_pid),
                account(&line_pda, false, true, &mut l2, &mut line_data, &vault_pid),
                account(&policy_pda, false, false, &mut l3, &mut policy_data, &policy_pid),
                account(&payee, false, false, &mut l4, &mut d4, &vault_pid),
                account(&agent, true, true, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
                account(&usage_pda, false, true, &mut l7, &mut usage_data, &vault_pid),
            ],
            &CreditVaultIx::Draw(DrawArgs {
                amount: 101,
                salt: 4,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            })
            .encode(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            ProgramError::Custom(Denial::TotalCap.program_error_code())
        );
        assert_eq!(CreditLine::unpack(&line_data).unwrap().reserved, 100);
    }
}

#[test]
fn underwriting_loose_denies_full_available() {
    let vault_pid = Pubkey::new_from_array(zeta_interface::ids::CREDIT_VAULT_ID);
    let policy_pid = Pubkey::new_from_array(zeta_interface::ids::POLICY_REGISTRY_ID);
    let authority = Pubkey::new_from_array([1; 32]);
    let mint = Pubkey::new_from_array([2; 32]);
    let vault_ata = Pubkey::new_from_array([3; 32]);
    let agent = Pubkey::new_from_array([9; 32]);
    let clock = solana_program::sysvar::clock::id();
    let system = system_program::id();

    let auth_b = authority.to_bytes();
    let mint_b = mint.to_bytes();
    let (pool_pda, _) =
        Pubkey::find_program_address(&pool_seeds(&auth_b, &mint_b), &vault_pid);
    let seed = 77u64;
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
        let mut a0 = 1u64;
        let mut a1 = 1u64;
        let mut e0 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut a0, &mut e0, &vault_pid),
                account(&pool_pda, false, true, &mut a1, &mut pool_data, &vault_pid),
            ],
            &CreditVaultIx::Deposit { amount: 10_000 }.encode(),
        )
        .unwrap();
    }
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
    }

    // Loose policy LTV 25% → max 2500; request 10_000 → UnderwritingDenied (6)
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
        let mut d3 = [];
        let mut d5 = [];
        let err = vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &policy_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
                account(&system, false, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::OpenLine(OpenLineArgs { limit: 10_000 }).encode(),
        )
        .unwrap_err();
        assert_eq!(err, ProgramError::Custom(6));
    }

    // Same loose policy at max LTV succeeds
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
        let mut d3 = [];
        let mut d5 = [];
        vault_process(
            &vault_pid,
            &[
                account(&authority, true, false, &mut l0, &mut d0, &vault_pid),
                account(&pool_pda, false, false, &mut l1, &mut pool_data, &vault_pid),
                account(&policy_pda, false, false, &mut l2, &mut policy_data, &policy_pid),
                account(&agent, false, false, &mut l3, &mut d3, &vault_pid),
                account(&line_pda, false, true, &mut l4, &mut line_data, &vault_pid),
                account(&system, false, false, &mut l5, &mut d5, &vault_pid),
                account(&clock, false, false, &mut l6, &mut clock_data, &vault_pid),
            ],
            &CreditVaultIx::OpenLine(OpenLineArgs { limit: 2_500 }).encode(),
        )
        .unwrap();
        assert_eq!(CreditLine::unpack(&line_data).unwrap().limit, 2_500);
    }
}
