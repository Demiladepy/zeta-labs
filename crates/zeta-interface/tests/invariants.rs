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
        _pad: [0; 12],
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
fn evaluate_ignores_recipient_and_category_in_v1() {
    let p = policy(10, 0, false);
    let mut a = input(10, 1);
    a.recipient = [0xff; 32];
    a.category = 7;
    assert_eq!(evaluate(&p, a), Denial::Allow);
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
    };
    assert!(DrawChannelSpec::from_draw([1; 32], [2; 32], [1; 32], [4; 32], [5; 32], args).is_err());
    let bad = DrawArgs {
        amount: 0,
        salt: 1,
        grace_period: 1,
        open_slot: 1,
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
