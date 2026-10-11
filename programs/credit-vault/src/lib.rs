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
    /// Policy too loose / expired / revoked for the requested line limit.
    UnderwritingDenied,
    /// Pool reentrancy lock set (nested vault entry during draw CPI).
    Reentrancy,
}

/// Underwriting v1: base 25% LTV; policy controls raise the haircut ceiling.
pub fn policy_ltv_bps(policy: &Policy) -> u64 {
    let mut bps = 2_500u64;
    if policy.expires_at != 0 {
        bps = bps.saturating_add(2_000);
    }
    if policy.acl_version != 0 {
        bps = bps.saturating_add(1_500);
    }
    if policy.total_cap != 0 {
        bps = bps.saturating_add(1_500);
    }
    if policy.rolling_cap != 0 {
        bps = bps.saturating_add(1_500);
    }
    bps.min(10_000)
}

/// Max line.limit allowed for this policy against current pool liquidity.
pub fn underwrite_limit(policy: &Policy, pool: &Pool, now_unix: i64) -> Result<u64, VaultError> {
    if policy.revoked {
        return Err(VaultError::UnderwritingDenied);
    }
    if policy.expires_at != 0 && now_unix >= policy.expires_at {
        return Err(VaultError::UnderwritingDenied);
    }
    let available = pool.deposited.saturating_sub(pool.outstanding);
    let mut max = available
        .saturating_mul(policy_ltv_bps(policy))
        / 10_000;
    if policy.total_cap != 0 {
        max = max.min(policy.total_cap);
    }
    Ok(max)
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
    now_unix: i64,
) -> Result<CreditLine, VaultError> {
    open_line_with_keys(
        pool,
        pool.authority,
        agent,
        policy.issuer,
        policy,
        args,
        bump,
        now_unix,
    )
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
    policy: &Policy,
    args: OpenLineArgs,
    bump: u8,
    now_unix: i64,
) -> Result<CreditLine, VaultError> {
    let max = underwrite_limit(policy, pool, now_unix)?;
    if args.limit == 0 || args.limit > max {
        return Err(VaultError::UnderwritingDenied);
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
            1,
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
            1,
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

    #[test]
    fn underwriting_ltv_bands() {
        let (pool, mut policy) = setup();
        // Loose: 25% of 10_000 = 2_500
        assert_eq!(policy_ltv_bps(&policy), 2_500);
        assert_eq!(underwrite_limit(&policy, &pool, 1).unwrap(), 2_500);
        assert!(matches!(
            open_line(&pool, [9; 32], &policy, OpenLineArgs { limit: 2_501 }, 255, 1),
            Err(VaultError::UnderwritingDenied)
        ));
        open_line(
            &pool,
            [9; 32],
            &policy,
            OpenLineArgs { limit: 2_500 },
            255,
            1,
        )
        .unwrap();

        policy.expires_at = 1_000;
        policy.acl_version = 1;
        policy.total_cap = 9_000;
        policy.rolling_cap = 5_000;
        // 2500+2000+1500+1500+1500 = 9000 bps → 9000 of 10000, min total_cap 9000
        assert_eq!(policy_ltv_bps(&policy), 9_000);
        assert_eq!(underwrite_limit(&policy, &pool, 1).unwrap(), 9_000);

        policy.revoked = true;
        assert!(matches!(
            underwrite_limit(&policy, &pool, 1),
            Err(VaultError::UnderwritingDenied)
        ));
    }

    /// Underwriting v1 states a thesis: **policy tightness is the collateral.**
    ///
    /// An autonomous agent has no credit history, no legal identity, and
    /// nothing to pledge. What it *can* offer is constraint — it accepts a
    /// tighter leash, and the tighter leash is what makes the loan safe. So
    /// the price of credit is how much freedom the borrower gives up.
    ///
    /// These tests prove the model is well-formed rather than merely present:
    /// monotone in tightness, bounded by liquidity, and never exceeding the
    /// lender's own ceiling.
    mod underwriting {
        use super::*;

        /// Every subset of policy controls, as (expiry, acl, total, rolling).
        fn all_control_sets() -> Vec<(bool, bool, bool, bool)> {
            let mut out = Vec::new();
            for m in 0u8..16 {
                out.push((m & 1 != 0, m & 2 != 0, m & 4 != 0, m & 8 != 0));
            }
            out
        }

        fn with_controls(base: &Policy, c: (bool, bool, bool, bool)) -> Policy {
            let mut p = *base;
            p.expires_at = if c.0 { 1_000 } else { 0 };
            p.acl_version = if c.1 { 1 } else { 0 };
            p.total_cap = if c.2 { u64::MAX } else { 0 };
            p.rolling_cap = if c.3 { 5_000 } else { 0 };
            p
        }

        fn tightness(c: (bool, bool, bool, bool)) -> u32 {
            c.0 as u32 + c.1 as u32 + c.2 as u32 + c.3 as u32
        }

        /// Accepting another constraint must never cost the agent credit.
        #[test]
        fn ltv_is_monotone_in_tightness() {
            let (_, base) = setup();
            for a in all_control_sets() {
                for b in all_control_sets() {
                    // b is a superset of a's controls
                    let superset = (a.0 <= b.0) && (a.1 <= b.1) && (a.2 <= b.2) && (a.3 <= b.3);
                    if !superset {
                        continue;
                    }
                    let la = policy_ltv_bps(&with_controls(&base, a));
                    let lb = policy_ltv_bps(&with_controls(&base, b));
                    assert!(
                        lb >= la,
                        "accepting more constraints lowered LTV: {a:?}={la} -> {b:?}={lb}"
                    );
                    if tightness(b) > tightness(a) {
                        assert!(lb > la, "a strictly tighter policy earned no more credit");
                    }
                }
            }
        }

        /// The loosest policy earns the 25% floor. The tightest earns 90% —
        /// never 100%. Even a maximally constrained agent keeps a 10% haircut,
        /// so the pool is never fully lent against a single line.
        #[test]
        fn ltv_is_bounded_by_floor_and_a_permanent_haircut() {
            let (_, base) = setup();
            for c in all_control_sets() {
                let bps = policy_ltv_bps(&with_controls(&base, c));
                assert!(bps >= 2_500, "{c:?} fell below the 25% floor: {bps}");
                assert!(bps <= 9_000, "{c:?} exceeded the 90% ceiling: {bps}");
            }
            assert_eq!(policy_ltv_bps(&with_controls(&base, (false, false, false, false))), 2_500);
            assert_eq!(
                policy_ltv_bps(&with_controls(&base, (true, true, true, true))),
                9_000,
                "the tightest possible policy still keeps a 10% haircut"
            );
        }

        /// A line can never be underwritten past the pool's free liquidity,
        /// whatever the policy claims. Outstanding credit is not lendable.
        #[test]
        fn limit_never_exceeds_available_liquidity() {
            let (mut pool, base) = setup();
            for outstanding in [0u64, 1, 2_500, 9_999, 10_000] {
                pool.outstanding = outstanding;
                let available = pool.deposited.saturating_sub(outstanding);
                for c in all_control_sets() {
                    let p = with_controls(&base, c);
                    let max = underwrite_limit(&p, &pool, 1).unwrap();
                    assert!(
                        max <= available,
                        "{c:?} underwrote {max} against {available} available"
                    );
                }
            }
        }

        /// The lender's own total cap is a hard ceiling on top of LTV.
        #[test]
        fn lender_total_cap_overrides_a_generous_ltv() {
            let (pool, base) = setup();
            let mut p = with_controls(&base, (true, true, true, true));
            assert_eq!(policy_ltv_bps(&p), 9_000);
            p.total_cap = 100;
            assert_eq!(underwrite_limit(&p, &pool, 1).unwrap(), 100);
        }

        /// A dead policy underwrites nothing, however tight it looks.
        #[test]
        fn revoked_or_expired_policy_underwrites_nothing() {
            let (pool, base) = setup();
            let mut revoked = with_controls(&base, (true, true, true, true));
            revoked.revoked = true;
            assert!(matches!(
                underwrite_limit(&revoked, &pool, 1),
                Err(VaultError::UnderwritingDenied)
            ));

            let expired = with_controls(&base, (true, true, true, true));
            assert!(matches!(
                underwrite_limit(&expired, &pool, 1_000),
                Err(VaultError::UnderwritingDenied)
            ));
            // One second before expiry it still underwrites.
            assert!(underwrite_limit(&expired, &pool, 999).is_ok());
        }

        /// An empty pool lends nothing rather than underflowing.
        #[test]
        fn drained_pool_underwrites_zero() {
            let (mut pool, base) = setup();
            pool.outstanding = pool.deposited;
            let p = with_controls(&base, (true, true, true, true));
            assert_eq!(underwrite_limit(&p, &pool, 1).unwrap(), 0);
            pool.outstanding = pool.deposited.saturating_add(1);
            assert_eq!(underwrite_limit(&p, &pool, 1).unwrap(), 0);
        }
    }
}
