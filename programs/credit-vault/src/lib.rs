//! Credit Vault v1. Escrow never sits in the agent's wallet.
//!
//! `draw` reserves the ceiling, requires a prior `evaluate` allow, and
//! produces a [`DrawChannelSpec`] for Payment Channels `open`.

use policy_registry;
use zeta_interface::{
    evaluate, CreditLine, Denial, DrawArgs, DrawChannelSpec, DrawSpecError, EvaluateInput,
    OpenLineArgs, Policy, Pool, RepayArgs, ACCOUNT_DISCRIMINATOR_LINE, ACCOUNT_DISCRIMINATOR_POOL,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VaultError {
    Unauthorized,
    InsufficientLiquidity,
    LineOverLimit,
    PolicyDenied(Denial),
    BadRepay,
    DrawSpec(DrawSpecError),
}

pub fn create_pool(
    authority: [u8; 32],
    mint: [u8; 32],
    vault_ata: [u8; 32],
    bump: u8,
) -> Pool {
    Pool {
        discriminator: ACCOUNT_DISCRIMINATOR_POOL,
        authority,
        mint,
        vault_ata,
        deposited: 0,
        outstanding: 0,
        bump,
        _pad: [0; 7],
    }
}

pub fn deposit(pool: &mut Pool, signer: [u8; 32], amount: u64) -> Result<(), VaultError> {
    if signer != pool.authority {
        return Err(VaultError::Unauthorized);
    }
    pool.deposited = pool
        .deposited
        .checked_add(amount)
        .ok_or(VaultError::InsufficientLiquidity)?;
    Ok(())
}

pub fn open_line(
    pool: &Pool,
    agent: [u8; 32],
    policy: &Policy,
    args: OpenLineArgs,
    bump: u8,
) -> Result<CreditLine, VaultError> {
    if args.limit == 0 || args.limit > pool.deposited.saturating_sub(pool.outstanding) {
        return Err(VaultError::InsufficientLiquidity);
    }
    Ok(CreditLine {
        discriminator: ACCOUNT_DISCRIMINATOR_LINE,
        pool: pool.authority,
        agent,
        policy: policy.issuer,
        limit: args.limit,
        drawn: 0,
        reserved: 0,
        bump,
        _pad: [0; 7],
    })
}

/// Reserve `amount` and return the Payment Channels `open` spec.
/// Caller (on-chain) then CPIs `open` with this spec.
pub fn draw(
    pool: &mut Pool,
    line: &mut CreditLine,
    policy: &Policy,
    payee: [u8; 32],
    rent_payer: [u8; 32],
    args: DrawArgs,
    now_unix: i64,
) -> Result<DrawChannelSpec, VaultError> {
    let denial = evaluate(
        policy,
        EvaluateInput {
            amount: args.amount,
            now_unix,
            recipient: payee,
            category: 0,
        },
    );
    if !denial.is_allow() {
        return Err(VaultError::PolicyDenied(denial));
    }
    if !line.reserve(args.amount) {
        return Err(VaultError::LineOverLimit);
    }
    pool.outstanding = pool
        .outstanding
        .checked_add(args.amount)
        .ok_or(VaultError::InsufficientLiquidity)?;
    if pool.outstanding > pool.deposited {
        return Err(VaultError::InsufficientLiquidity);
    }
    DrawChannelSpec::from_draw(
        /* payer = pool PDA placeholder: authority for host tests */
        pool.authority,
        pool.vault_ata,
        payee,
        pool.mint,
        rent_payer,
        args,
    )
    .map_err(VaultError::DrawSpec)
}

pub fn repay(pool: &mut Pool, line: &mut CreditLine, args: RepayArgs) -> Result<(), VaultError> {
    if !line.repay(args.reserved_this_draw, args.settled) {
        return Err(VaultError::BadRepay);
    }
    pool.outstanding = pool
        .outstanding
        .checked_sub(args.reserved_this_draw)
        .ok_or(VaultError::BadRepay)?;
    pool.deposited = pool
        .deposited
        .checked_sub(args.settled)
        .ok_or(VaultError::BadRepay)?;
    Ok(())
}

// Keep the policy crate linked so the two programs stay one workspace.
#[allow(dead_code)]
fn _link_policy() {
    let _ = policy_registry::PolicyError::Unauthorized;
}

#[cfg(test)]
mod tests {
    use super::*;
    use policy_registry::register_policy;
    use zeta_interface::RegisterPolicyArgs;

    fn setup() -> (Pool, Policy) {
        let mut pool = create_pool([1; 32], [2; 32], [3; 32], 255);
        deposit(&mut pool, [1; 32], 10_000).unwrap();
        let policy = register_policy(
            [1; 32],
            255,
            RegisterPolicyArgs {
                seed: 1,
                per_call_cap: 500,
                expires_at: 0,
            },
        )
        .unwrap();
        (pool, policy)
    }

    #[test]
    fn e2e_draw_meter_repay() {
        let (mut pool, policy) = setup();
        let mut line = open_line(
            &pool,
            [9; 32],
            &policy,
            OpenLineArgs { limit: 2_000 },
            255,
        )
        .unwrap();
        let spec = draw(
            &mut pool,
            &mut line,
            &policy,
            [8; 32],
            [9; 32],
            DrawArgs {
                amount: 400,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
            },
            1,
        )
        .unwrap();
        assert_eq!(spec.deposit, 400);
        assert_eq!(line.reserved, 400);
        assert_eq!(pool.outstanding, 400);
        repay(
            &mut pool,
            &mut line,
            RepayArgs {
                reserved_this_draw: 400,
                settled: 120,
            },
        )
        .unwrap();
        assert_eq!(line.drawn, 120);
        assert_eq!(line.reserved, 0);
        assert_eq!(pool.outstanding, 0);
        assert_eq!(pool.deposited, 9_880);
    }

    #[test]
    fn deny_over_cap_does_not_reserve() {
        let (mut pool, policy) = setup();
        let mut line = open_line(
            &pool,
            [9; 32],
            &policy,
            OpenLineArgs { limit: 2_000 },
            255,
        )
        .unwrap();
        let err = draw(
            &mut pool,
            &mut line,
            &policy,
            [8; 32],
            [9; 32],
            DrawArgs {
                amount: 501,
                salt: 1,
                grace_period: 60,
                open_slot: 10,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, VaultError::PolicyDenied(Denial::PerCallCap));
        assert_eq!(line.reserved, 0);
        assert_eq!(pool.outstanding, 0);
    }
}
