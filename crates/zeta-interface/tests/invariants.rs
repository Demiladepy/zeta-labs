//! P1–P3 host invariants. LiteSVM tests will call the same `evaluate` + line math.

use zeta_interface::{
    evaluate, AuditRecord, CreditLine, Denial, DrawArgs, DrawChannelSpec, EvaluateInput, Policy,
    ACCOUNT_DISCRIMINATOR_LINE, ACCOUNT_DISCRIMINATOR_POLICY,
};

fn policy(per_call_cap: u64, expires_at: i64, revoked: bool) -> Policy {
    Policy {
        discriminator: ACCOUNT_DISCRIMINATOR_POLICY,
        issuer: [1; 32],
        seed: 1,
        per_call_cap,
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

fn line(limit: u64, drawn: u64, reserved: u64) -> CreditLine {
    CreditLine {
        discriminator: ACCOUNT_DISCRIMINATOR_LINE,
        pool: [2; 32],
        agent: [3; 32],
        policy: [4; 32],
        limit,
        drawn,
        reserved,
        bump: 255,
        _pad: [0; 7],
    }
}

fn input(amount: u64, now: i64) -> EvaluateInput {
    EvaluateInput {
        amount,
        now_unix: now,
        recipient: [9; 32],
        category: 0,
        acl_allows: None,
        line_drawn: 0,
        line_reserved: 0,
        rolling_spent: 0,
        window_start: 0,
    }
}

#[test]
fn p1_no_overspend_on_line() {
    let mut l = line(1_000, 400, 500);
    assert!(!l.can_draw(101));
    assert!(l.can_draw(100));
    assert!(l.reserve(100));
    assert_eq!(l.reserved, 600);
    assert!(!l.reserve(1));
}

#[test]
fn p1_zero_draw_rejected() {
    let l = line(1_000, 0, 0);
    assert!(!l.can_draw(0));
}

#[test]
fn p1_repay_releases_unused_and_books_settled() {
    let mut l = line(1_000, 0, 0);
    assert!(l.reserve(250));
    assert!(l.repay(250, 80));
    assert_eq!(l.reserved, 0);
    assert_eq!(l.drawn, 80);
    assert!(l.can_draw(920));
    assert!(!l.can_draw(921));
}

#[test]
fn p1_repay_rejects_settled_above_reserved() {
    let mut l = line(1_000, 0, 100);
    assert!(!l.repay(100, 101));
}

#[test]
fn p2_no_spend_after_expiry() {
    let p = policy(500, 1_000, false);
    assert_eq!(evaluate(&p, input(10, 999)), Denial::Allow);
    assert_eq!(evaluate(&p, input(10, 1_000)), Denial::Expired);
    assert_eq!(evaluate(&p, input(10, 1_001)), Denial::Expired);
}

#[test]
fn p2_zero_expiry_means_none() {
    let p = policy(500, 0, false);
    assert_eq!(evaluate(&p, input(10, i64::MAX)), Denial::Allow);
}

#[test]
fn p3_revocation_is_immediate() {
    let live = policy(500, 0, false);
    let dead = policy(500, 0, true);
    assert_eq!(evaluate(&live, input(10, 1)), Denial::Allow);
    assert_eq!(evaluate(&dead, input(10, 1)), Denial::Revoked);
}

#[test]
fn p3_revoke_beats_other_checks() {
    let p = policy(1, 1, true);
    assert_eq!(evaluate(&p, input(99, 99)), Denial::Revoked);
}

#[test]
fn per_call_cap_and_zero_amount() {
    let p = policy(50, 0, false);
    assert_eq!(evaluate(&p, input(50, 1)), Denial::Allow);
    assert_eq!(evaluate(&p, input(51, 1)), Denial::PerCallCap);
    assert_eq!(evaluate(&p, input(0, 1)), Denial::PerCallCap);
}

#[test]
fn evaluate_acl_gated_by_acl_version() {
    let p = policy(10, 0, false);
    let mut a = input(10, 1);
    a.recipient = [0xff; 32];
    a.category = 7;
    a.acl_allows = None;
    assert_eq!(evaluate(&p, a), Denial::Allow);
    a.acl_allows = Some(false);
    assert_eq!(evaluate(&p, a), Denial::Allow);

    let mut p_acl = policy(10, 0, false);
    p_acl.acl_version = 1;
    a.acl_allows = None;
    assert_eq!(evaluate(&p_acl, a), Denial::NotAllowlisted);
    a.acl_allows = Some(false);
    assert_eq!(evaluate(&p_acl, a), Denial::NotAllowlisted);
    a.acl_allows = Some(true);
    assert_eq!(evaluate(&p_acl, a), Denial::Allow);
}

    #[test]
    fn evaluate_p5_total_and_rolling_caps() {
        let mut p = policy(1_000, 0, false);
        p.total_cap = 500;
        let mut a = input(200, 1);
        a.line_drawn = 200;
        a.line_reserved = 100;
        assert_eq!(evaluate(&p, a), Denial::Allow); // 300+200=500
        a.amount = 201;
        assert_eq!(evaluate(&p, a), Denial::TotalCap);

        let mut r = policy(1_000, 0, false);
        r.rolling_cap = 300;
        r.rolling_window_secs = 3_600;
        let mut b = input(100, 1_000);
        b.rolling_spent = 250;
        b.window_start = 500; // still in window
        assert_eq!(evaluate(&r, b), Denial::RollingCap); // 250+100 > 300
        b.amount = 50;
        assert_eq!(evaluate(&r, b), Denial::Allow); // 250+50 = 300
        // window elapsed → spent resets
        b.amount = 300;
        b.now_unix = 500 + 3_600;
        assert_eq!(evaluate(&r, b), Denial::Allow);
    }

    #[test]
    fn rolling_window_exact_boundary() {
        let mut r = policy(1_000, 0, false);
        r.rolling_cap = 100;
        r.rolling_window_secs = 60;
        let mut b = input(100, 1_059);
        b.rolling_spent = 100;
        b.window_start = 1_000;
        // still inside window (59 < 60)
        assert_eq!(evaluate(&r, b), Denial::RollingCap);
        // exact boundary resets
        b.now_unix = 1_060;
        assert_eq!(evaluate(&r, b), Denial::Allow);
    }

    #[test]
    fn rolling_cap_requires_nonzero_window() {
        let mut r = policy(1_000, 0, false);
        r.rolling_cap = 100;
        r.rolling_window_secs = 0;
        assert_eq!(evaluate(&r, input(1, 1)), Denial::RollingCap);
    }

    #[test]
    fn total_and_rolling_overflow_deny() {
        let mut t = policy(u64::MAX, 0, false);
        t.total_cap = u64::MAX;
        let mut a = input(1, 1);
        a.line_drawn = u64::MAX;
        a.line_reserved = 0;
        assert_eq!(evaluate(&t, a), Denial::TotalCap);
        a.line_drawn = u64::MAX / 2 + 1;
        a.line_reserved = u64::MAX / 2 + 1;
        a.amount = 1;
        assert_eq!(evaluate(&t, a), Denial::TotalCap);

        let mut r = policy(u64::MAX, 0, false);
        r.rolling_cap = u64::MAX;
        r.rolling_window_secs = 60;
        let mut b = input(1, 10);
        b.rolling_spent = u64::MAX;
        b.window_start = 1;
        assert_eq!(evaluate(&r, b), Denial::RollingCap);
    }

    #[test]
    fn line_usage_boundary_apply_draw() {
        use zeta_interface::{LineUsage, ACCOUNT_DISCRIMINATOR_LINE_USAGE};
        let mut u = LineUsage {
            discriminator: ACCOUNT_DISCRIMINATOR_LINE_USAGE,
            line: [1; 32],
            window_start: 1_000,
            rolling_spent: 40,
            bump: 1,
            _pad: [0; 7],
        };
        assert_eq!(u.effective_spent(1_059, 60), 40);
        assert_eq!(u.effective_spent(1_060, 60), 0);
        u.apply_draw(10, 1_060, 60);
        assert_eq!(u.window_start, 1_060);
        assert_eq!(u.rolling_spent, 10);
    }

    #[test]
    fn mid_window_set_caps_uses_new_window_length() {
        // After set_caps shortens the window, the same window_start can already
        // be "elapsed" under the new length — tumbling resets (documented).
        let mut r = policy(1_000, 0, false);
        r.rolling_cap = 100;
        r.rolling_window_secs = 3_600;
        let mut b = input(100, 2_000);
        b.rolling_spent = 90;
        b.window_start = 1_000;
        assert_eq!(evaluate(&r, b), Denial::RollingCap); // still in 3600s window
        r.rolling_window_secs = 500; // issuer shortened mid-flight
        assert_eq!(evaluate(&r, b), Denial::Allow); // 2000-1000 >= 500 → reset
    }

    #[test]
    fn ordered_checks_expiry_before_cap() {
    let p = policy(1, 10, false);
    assert_eq!(evaluate(&p, input(99, 10)), Denial::Expired);
}

#[test]
fn audit_record_flags_match_denial() {
    let rec = AuditRecord::new([1; 32], [2; 32], [3; 32], 40, Denial::Revoked, 9, 8);
    assert!(!rec.allowed);
    assert_eq!(rec.denial, Denial::Revoked.as_u8());
    let ok = AuditRecord::new([1; 32], [2; 32], [3; 32], 40, Denial::Allow, 9, 8);
    assert!(ok.allowed);
}

#[test]
fn draw_spec_matches_x402_upto_max_amount() {
    let spec = DrawChannelSpec::from_draw(
        [1; 32],
        [2; 32],
        [3; 32],
        [4; 32],
        [5; 32],
        DrawArgs {
            amount: 1_000,
            salt: 7,
            grace_period: 900,
            open_slot: 42,
            category: 0,
        },
    )
    .unwrap();
    assert!(spec.matches_max_amount(1_000));
    assert!(!spec.matches_max_amount(999));
    assert_eq!(spec.authorized_signer, spec.payee);
    assert_eq!(spec.deposit, 1_000);
}

#[test]
fn draw_spec_rejects_zero_and_same_payer_payee() {
    let args = DrawArgs {
        amount: 1,
        salt: 1,
        grace_period: 1,
        open_slot: 1,
        category: 0,
    };
    assert!(DrawChannelSpec::from_draw([1; 32], [2; 32], [1; 32], [4; 32], [5; 32], args).is_err());
    let bad = DrawArgs {
        amount: 0,
        salt: 1,
        grace_period: 1,
        open_slot: 1,
        category: 0,
    };
    assert!(DrawChannelSpec::from_draw([1; 32], [2; 32], [3; 32], [4; 32], [5; 32], bad).is_err());
}

#[test]
fn seven_step_happy_path_state() {
    let p = policy(200, 0, false);
    let mut l = line(1_000, 0, 0);
    assert_eq!(evaluate(&p, input(200, 50)), Denial::Allow);
    assert!(l.reserve(200));
    assert!(l.repay(200, 75));
    assert_eq!(l.drawn, 75);
    assert_eq!(l.reserved, 0);
}

#[test]
fn seven_step_deny_then_revoke() {
    let mut p = policy(10, 0, false);
    assert_eq!(evaluate(&p, input(11, 1)), Denial::PerCallCap);
    p.revoked = true;
    assert_eq!(evaluate(&p, input(5, 1)), Denial::Revoked);
}

/// Fragmentation resistance.
///
/// "SoK: Blockchain Agent-to-Agent Payments" (arXiv:2604.03733) names this as
/// an open problem in deployed agent-payment systems:
///
/// > "Authorization policies constrain individual transactions (e.g., amount,
/// > recipient, rules). However, they do not capture the execution history,
/// > cumulative spend, or multi-step strategies. Therefore, sequences of valid
/// > transactions may violate intended spending boundaries through repetition,
/// > fragmentation, or timing manipulation."
///
/// Zeta's windowed `LineUsage` accumulator is the answer. These tests state the
/// exact bound it provides — and, honestly, where that bound stops.
mod fragmentation {
    use super::*;
    use zeta_interface::{LineUsage, ACCOUNT_DISCRIMINATOR_LINE_USAGE};

    fn fresh_usage() -> LineUsage {
        LineUsage {
            discriminator: ACCOUNT_DISCRIMINATOR_LINE_USAGE,
            line: [4; 32],
            window_start: 0,
            rolling_spent: 0,
            bump: 1,
            _pad: [0; 7],
        }
    }

    /// Replay an attacker-chosen decomposition against the real `evaluate`
    /// body, applying `LineUsage::apply_draw` on every allow exactly as the
    /// on-chain `draw` path does. Returns (total admitted, denial count).
    fn run_sequence(p: &Policy, chunks: &[(u64, i64)]) -> (u64, usize) {
        let mut usage = fresh_usage();
        let mut admitted: u64 = 0;
        let mut denied = 0usize;
        for &(amount, now) in chunks {
            let mut i = input(amount, now);
            i.rolling_spent = usage.rolling_spent;
            i.window_start = usage.window_start;
            if evaluate(p, i) == Denial::Allow {
                usage.apply_draw(amount, now, p.rolling_window_secs);
                admitted = admitted.saturating_add(amount);
            } else {
                denied += 1;
            }
        }
        (admitted, denied)
    }

    /// The attack the SoK describes, with only a per-call cap in place.
    /// Every single call is individually valid; the sequence is not.
    #[test]
    fn per_call_cap_alone_does_not_bound_a_fragmented_drain() {
        let p = policy(100, 0, false); // rolling_cap == 0 -> accumulator off
        let seq: Vec<(u64, i64)> = (0..100).map(|k| (100u64, 1_000 + k as i64)).collect();
        let (admitted, denied) = run_sequence(&p, &seq);
        assert_eq!(denied, 0, "every fragmented call passes the per-call check");
        assert_eq!(admitted, 10_000, "100x the per-call ceiling drained legally");
    }

    /// Same attacker, accumulator on. No decomposition beats the window cap.
    #[test]
    fn fragmentation_cannot_exceed_rolling_cap_within_one_window() {
        let mut p = policy(1_000, 0, false);
        p.rolling_cap = 500;
        p.rolling_window_secs = 3_600;

        // Sweep every chunk size the attacker could legally choose.
        for chunk in 1..=p.per_call_cap {
            let seq: Vec<(u64, i64)> =
                (0..64).map(|k| (chunk, 1_000 + k as i64)).collect();
            let (admitted, _) = run_sequence(&p, &seq);
            assert!(
                admitted <= p.rolling_cap,
                "chunk {chunk}: admitted {admitted} exceeded rolling cap {}",
                p.rolling_cap
            );
        }
    }

    /// Honest statement of the limit: a tumbling window is not a sliding
    /// window. An attacker who times a burst at the end of one window and
    /// again at the start of the next admits at most 2x rolling_cap across
    /// that boundary — and never more.
    #[test]
    fn tumbling_window_boundary_burst_is_bounded_by_two_caps() {
        let mut p = policy(1_000, 0, false);
        p.rolling_cap = 500;
        p.rolling_window_secs = 3_600;

        let seq = vec![
            (500, 1_000),         // fills window 1
            (500, 1_000 + 3_599), // still inside window 1 -> denied
            (500, 1_000 + 3_600), // boundary resets -> allowed
        ];
        let (admitted, denied) = run_sequence(&p, &seq);
        assert_eq!(denied, 1);
        assert_eq!(admitted, 2 * p.rolling_cap, "exactly two caps, not more");
    }

    /// General bound: sustained timing manipulation over W windows admits at
    /// most W x rolling_cap, however the attacker fragments inside them.
    #[test]
    fn timing_manipulation_is_bounded_by_windows_elapsed() {
        let mut p = policy(1_000, 0, false);
        p.rolling_cap = 500;
        p.rolling_window_secs = 600;

        let windows = 10i64;
        let mut seq = Vec::new();
        for w in 0..windows {
            let t = 1_000 + w * 600;
            for _ in 0..8 {
                seq.push((200u64, t)); // 1_600 attempted per window
            }
        }
        let (admitted, denied) = run_sequence(&p, &seq);
        assert!(
            admitted <= (windows as u64) * p.rolling_cap,
            "admitted {admitted} exceeded {windows} x {}",
            p.rolling_cap
        );
        assert!(denied > 0, "the accumulator must actually bite");
    }
}
