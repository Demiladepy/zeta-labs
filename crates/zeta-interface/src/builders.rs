//! Client-side instruction shells. Account order matches the processors.
//!
//! Pubkeys are `[u8; 32]` so this crate stays Solana-SDK-free. Joshna maps
//! these into `@solana/kit` / web3 AccountMeta.

use crate::instructions::{
    CreditVaultIx, DrawArgs, EvaluateArgs, OpenLineArgs, PolicyRegistryIx, RegisterPolicyArgs,
    RepayArgs, SetAclArgs,
};
use crate::paykit::OpenAccountMeta;

/// System Program id (`11111111111111111111111111111111`).
pub const SYSTEM_PROGRAM_ID: [u8; 32] = [0u8; 32];

/// Built instruction: program id + metas + data.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IxShell {
    pub program_id: [u8; 32],
    pub accounts: Vec<OpenAccountMeta>,
    pub data: Vec<u8>,
}

fn meta(pubkey: [u8; 32], is_signer: bool, is_writable: bool) -> OpenAccountMeta {
    OpenAccountMeta {
        pubkey,
        is_signer,
        is_writable,
    }
}

/// Accounts: `[issuer (s,w), policy_pda (w), system_program]`
///
/// Trailing `system_program` lets the policy program `create_account` the PDA
/// via `invoke_signed`. Not needed if the PDA is already allocated.
pub fn build_register_policy(
    program_id: [u8; 32],
    issuer: [u8; 32],
    policy_pda: [u8; 32],
    args: RegisterPolicyArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(issuer, true, true),
            meta(policy_pda, false, true),
            meta(SYSTEM_PROGRAM_ID, false, false),
        ],
        data: PolicyRegistryIx::RegisterPolicy(args).encode(),
    }
}

/// Accounts: `[policy, line, agent, clock]`
pub fn build_evaluate(
    program_id: [u8; 32],
    policy: [u8; 32],
    line: [u8; 32],
    agent: [u8; 32],
    clock: [u8; 32],
    args: EvaluateArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(policy, false, false),
            meta(line, false, false),
            meta(agent, false, false),
            meta(clock, false, false),
        ],
        data: PolicyRegistryIx::Evaluate(args).encode(),
    }
}

/// Accounts: `[policy, line, agent, clock, acl]` — required when `acl_version != 0`.
pub fn build_evaluate_with_acl(
    program_id: [u8; 32],
    policy: [u8; 32],
    line: [u8; 32],
    agent: [u8; 32],
    clock: [u8; 32],
    acl: [u8; 32],
    args: EvaluateArgs,
) -> IxShell {
    let mut ix = build_evaluate(program_id, policy, line, agent, clock, args);
    ix.accounts.push(meta(acl, false, false));
    ix
}

/// Accounts: `[issuer (s), policy (w)]`
pub fn build_revoke(program_id: [u8; 32], issuer: [u8; 32], policy: [u8; 32]) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![meta(issuer, true, false), meta(policy, false, true)],
        data: PolicyRegistryIx::Revoke.encode(),
    }
}

/// Accounts: `[issuer (s,w), policy (w), acl_pda (w), system_program]`
pub fn build_set_acl(
    program_id: [u8; 32],
    issuer: [u8; 32],
    policy: [u8; 32],
    acl_pda: [u8; 32],
    args: SetAclArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(issuer, true, true),
            meta(policy, false, true),
            meta(acl_pda, false, true),
            meta(SYSTEM_PROGRAM_ID, false, false),
        ],
        data: PolicyRegistryIx::SetAcl(args).encode(),
    }
}

/// Accounts: `[authority (s,w), mint, pool_pda (w), vault_ata, system_program]`
pub fn build_create_pool(
    program_id: [u8; 32],
    authority: [u8; 32],
    mint: [u8; 32],
    pool_pda: [u8; 32],
    vault_ata: [u8; 32],
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(authority, true, true),
            meta(mint, false, false),
            meta(pool_pda, false, true),
            meta(vault_ata, false, false),
            meta(SYSTEM_PROGRAM_ID, false, false),
        ],
        data: CreditVaultIx::CreatePool.encode(),
    }
}

/// Accounting-only deposit (no token CPI).
/// Accounts: `[authority (s), pool (w)]`
pub fn build_deposit(
    program_id: [u8; 32],
    authority: [u8; 32],
    pool: [u8; 32],
    amount: u64,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![meta(authority, true, false), meta(pool, false, true)],
        data: CreditVaultIx::Deposit { amount }.encode(),
    }
}

/// Deposit that also CPI-transfers SPL tokens.
/// Accounts: `[authority (s), pool (w), source (w), vault_ata (w), token_program]`
pub fn build_deposit_with_transfer(
    program_id: [u8; 32],
    authority: [u8; 32],
    pool: [u8; 32],
    source_ata: [u8; 32],
    vault_ata: [u8; 32],
    token_program: [u8; 32],
    amount: u64,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(authority, true, false),
            meta(pool, false, true),
            meta(source_ata, false, true),
            meta(vault_ata, false, true),
            meta(token_program, false, false),
        ],
        data: CreditVaultIx::Deposit { amount }.encode(),
    }
}

/// Accounts: `[authority (s,w), pool, policy, agent, line_pda (w), system_program]`
pub fn build_open_line(
    program_id: [u8; 32],
    authority: [u8; 32],
    pool: [u8; 32],
    policy: [u8; 32],
    agent: [u8; 32],
    line_pda: [u8; 32],
    args: OpenLineArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(authority, true, true),
            meta(pool, false, false),
            meta(policy, false, false),
            meta(agent, false, false),
            meta(line_pda, false, true),
            meta(SYSTEM_PROGRAM_ID, false, false),
        ],
        data: CreditVaultIx::OpenLine(args).encode(),
    }
}

/// Core draw accounts (no Payment Channels CPI). Encodes allow → reserve.
/// Accounts: `[agent (s), pool (w), line (w), policy, payee, rent_payer (s), clock]`
/// When `policy.acl_version != 0`, append ACL via [`build_draw_with_acl`].
pub fn build_draw(
    program_id: [u8; 32],
    agent: [u8; 32],
    pool: [u8; 32],
    line: [u8; 32],
    policy: [u8; 32],
    payee: [u8; 32],
    rent_payer: [u8; 32],
    clock: [u8; 32],
    args: DrawArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(agent, true, false),
            meta(pool, false, true),
            meta(line, false, true),
            meta(policy, false, false),
            meta(payee, false, false),
            meta(rent_payer, true, false),
            meta(clock, false, false),
        ],
        data: CreditVaultIx::Draw(args).encode(),
    }
}

/// Draw with P4 ACL account after clock.
/// Accounts: `[agent (s), pool (w), line (w), policy, payee, rent_payer (s), clock, acl]`
pub fn build_draw_with_acl(
    program_id: [u8; 32],
    agent: [u8; 32],
    pool: [u8; 32],
    line: [u8; 32],
    policy: [u8; 32],
    payee: [u8; 32],
    rent_payer: [u8; 32],
    clock: [u8; 32],
    acl: [u8; 32],
    args: DrawArgs,
) -> IxShell {
    let mut ix = build_draw(
        program_id,
        agent,
        pool,
        line,
        policy,
        payee,
        rent_payer,
        clock,
        args,
    );
    ix.accounts.push(meta(acl, false, false));
    ix
}

/// Draw that also CPI-invokes Payment Channels `open`.
///
/// After the 7 core accounts (8 when ACL required): `[channels_program, ...14 open accounts...]`.
/// `distribution_extra` is appended to ix data after the draw header.
pub fn build_draw_with_channel_open(
    program_id: [u8; 32],
    agent: [u8; 32],
    pool: [u8; 32],
    line: [u8; 32],
    policy: [u8; 32],
    payee: [u8; 32],
    rent_payer: [u8; 32],
    clock: [u8; 32],
    channels_program: [u8; 32],
    open_accounts: [[u8; 32]; 14],
    open_signers: [bool; 14],
    open_writable: [bool; 14],
    args: DrawArgs,
    distribution_extra: &[u8],
) -> IxShell {
    let mut accounts = build_draw(
        program_id,
        agent,
        pool,
        line,
        policy,
        payee,
        rent_payer,
        clock,
        args,
    )
    .accounts;
    accounts.push(meta(channels_program, false, false));
    for i in 0..14 {
        accounts.push(meta(open_accounts[i], open_signers[i], open_writable[i]));
    }
    IxShell {
        program_id,
        accounts,
        data: CreditVaultIx::encode_draw(args, distribution_extra),
    }
}

/// Accounts: `[signer (s), pool (w), line (w)]` — agent or pool authority.
pub fn build_repay(
    program_id: [u8; 32],
    signer: [u8; 32],
    pool: [u8; 32],
    line: [u8; 32],
    args: RepayArgs,
) -> IxShell {
    IxShell {
        program_id,
        accounts: vec![
            meta(signer, true, false),
            meta(pool, false, true),
            meta(line, false, true),
        ],
        data: CreditVaultIx::Repay(args).encode(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::{CREDIT_VAULT_ID, POLICY_REGISTRY_ID};
    use crate::paykit::PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT;

    #[test]
    fn register_policy_account_order() {
        let ix = build_register_policy(
            POLICY_REGISTRY_ID,
            [1; 32],
            [2; 32],
            RegisterPolicyArgs {
                seed: 9,
                per_call_cap: 50,
                expires_at: 0,
            },
        );
        assert_eq!(ix.accounts.len(), 3);
        assert!(ix.accounts[0].is_signer);
        assert!(ix.accounts[1].is_writable);
        assert_eq!(ix.accounts[2].pubkey, SYSTEM_PROGRAM_ID);
        assert_eq!(ix.data[0], 0);
        assert_eq!(
            PolicyRegistryIx::decode(&ix.data),
            Some(PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
                seed: 9,
                per_call_cap: 50,
                expires_at: 0,
            }))
        );
    }

    #[test]
    fn draw_core_has_seven_accounts() {
        let ix = build_draw(
            CREDIT_VAULT_ID,
            [9; 32],
            [1; 32],
            [2; 32],
            [3; 32],
            [8; 32],
            [9; 32],
            [11; 32],
            DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
        );
        assert_eq!(ix.accounts.len(), 7);
        assert!(ix.accounts[0].is_signer);
        assert!(ix.accounts[1].is_writable);
        assert!(ix.accounts[2].is_writable);
        assert!(ix.accounts[5].is_signer);
        let (decoded, extra) = CreditVaultIx::decode(&ix.data).unwrap();
        assert!(extra.is_empty());
        match decoded {
            CreditVaultIx::Draw(a) => {
                assert_eq!(a.amount, 100);
                assert_eq!(a.category, 0);
            }
            _ => panic!("expected draw"),
        }
    }

    #[test]
    fn draw_with_channel_appends_14_plus_program() {
        let opens = [[7u8; 32]; 14];
        let mut signers = [false; 14];
        signers[0] = true; // payer
        signers[1] = true; // rent_payer
        let writables = [
            true, true, false, false, false, true, true, true, false, false, false, false, false,
            false,
        ];
        let ix = build_draw_with_channel_open(
            CREDIT_VAULT_ID,
            [9; 32],
            [1; 32],
            [2; 32],
            [3; 32],
            [8; 32],
            [9; 32],
            [11; 32],
            [0x42; 32],
            opens,
            signers,
            writables,
            DrawArgs {
                amount: 100,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
                category: 0,
            },
            &[1, 2, 3, 4],
        );
        assert_eq!(
            ix.accounts.len(),
            7 + 1 + PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT
        );
        let (decoded, extra) = CreditVaultIx::decode(&ix.data).unwrap();
        assert!(matches!(decoded, CreditVaultIx::Draw(_)));
        assert_eq!(extra, &[1, 2, 3, 4]);
    }

    #[test]
    fn deposit_transfer_variant_has_five_accounts() {
        let ix = build_deposit_with_transfer(
            CREDIT_VAULT_ID,
            [1; 32],
            [2; 32],
            [3; 32],
            [4; 32],
            [5; 32],
            1_000,
        );
        assert_eq!(ix.accounts.len(), 5);
        assert!(ix.accounts[2].is_writable);
        assert!(ix.accounts[3].is_writable);
    }
}
