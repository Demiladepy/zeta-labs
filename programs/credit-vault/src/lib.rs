//! Credit Vault v1. Escrow never sits in the agent's wallet.
#![allow(unexpected_cfgs)]
//!
//! `draw` reserves the ceiling, requires a prior `evaluate` allow, and
//! produces a [`DrawChannelSpec`] for Payment Channels `open`.

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
    open_line_with_keys(pool, pool.authority, agent, policy.issuer, args, bump)
}

pub fn evaluate_draw(
    policy: &Policy,
    payee: [u8; 32],
    args: &DrawArgs,
    now_unix: i64,
    acl_allows: Option<bool>,
    line_drawn: u64,
    line_reserved: u64,
    rolling_spent: u64,
    window_start: i64,
) -> Denial {
    evaluate(
        policy,
        EvaluateInput {
            amount: args.amount,
            now_unix,
            recipient: payee,
            category: args.category,
            acl_allows,
            line_drawn,
            line_reserved,
            rolling_spent,
            window_start,
        },
    )
}

/// Reserve after a prior allow. Rolls back if liquidity or spec checks fail.
pub fn reserve_draw(
    pool: &mut Pool,
    line: &mut CreditLine,
    payer: [u8; 32],
    payee: [u8; 32],
    rent_payer: [u8; 32],
    args: DrawArgs,
) -> Result<DrawChannelSpec, VaultError> {
    if !line.reserve(args.amount) {
        return Err(VaultError::LineOverLimit);
    }
    let next_outstanding = match pool.outstanding.checked_add(args.amount) {
        Some(v) if v <= pool.deposited => v,
        _ => {
            line.reserved -= args.amount;
            return Err(VaultError::InsufficientLiquidity);
        }
    };
    match DrawChannelSpec::from_draw(payer, pool.vault_ata, payee, pool.mint, rent_payer, args) {
        Ok(spec) => {
            pool.outstanding = next_outstanding;
            Ok(spec)
        }
        Err(e) => {
            line.reserved -= args.amount;
            Err(VaultError::DrawSpec(e))
        }
    }
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
    let denial = evaluate_draw(
        policy,
        payee,
        &args,
        now_unix,
        None,
        line.drawn,
        line.reserved,
        0,
        0,
    );
    if !denial.is_allow() {
        return Err(VaultError::PolicyDenied(denial));
    }
    reserve_draw(pool, line, pool.authority, payee, rent_payer, args)
}

pub fn open_line_with_keys(
    pool: &Pool,
    pool_key: [u8; 32],
    agent: [u8; 32],
    policy_key: [u8; 32],
    args: OpenLineArgs,
    bump: u8,
) -> Result<CreditLine, VaultError> {
    if args.limit == 0 || args.limit > pool.deposited.saturating_sub(pool.outstanding) {
        return Err(VaultError::InsufficientLiquidity);
    }
    Ok(CreditLine {
        discriminator: ACCOUNT_DISCRIMINATOR_LINE,
        pool: pool_key,
        agent,
        policy: policy_key,
        limit: args.limit,
        drawn: 0,
        reserved: 0,
        bump,
        _pad: [0; 7],
    })
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

pub mod pda;
pub mod processor;
pub use processor::process_instruction;

#[cfg(test)]
mod tests {
    use super::*;
    use zeta_interface::{RegisterPolicyArgs, ACCOUNT_DISCRIMINATOR_POLICY};

    fn setup() -> (Pool, Policy) {
        let mut pool = create_pool([1; 32], [2; 32], [3; 32], 255);
        deposit(&mut pool, [1; 32], 10_000).unwrap();
        let policy = Policy {
            discriminator: ACCOUNT_DISCRIMINATOR_POLICY,
            issuer: [1; 32],
            seed: 1,
            per_call_cap: 500,
            expires_at: 0,
            rolling_cap: 0,
            total_cap: 0,
            acl_version: 0,
            revoked: false,
            bump: 255,
            rolling_window_secs: 0,
            _pad: [0; 8],
        };
        let _ = RegisterPolicyArgs {
            seed: 1,
            per_call_cap: 500,
            expires_at: 0,
        };
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
                category: 0,
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
                category: 0,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, VaultError::PolicyDenied(Denial::PerCallCap));
        assert_eq!(line.reserved, 0);
        assert_eq!(pool.outstanding, 0);
    }
}
