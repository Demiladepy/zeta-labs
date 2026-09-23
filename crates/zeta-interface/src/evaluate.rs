//! Ordered policy checks. First failure wins. Always pair with an AuditRecord.

use crate::accounts::Policy;
use crate::denial::Denial;

#[derive(Clone, Copy, Debug)]
pub struct EvaluateInput {
    pub amount: u64,
    pub now_unix: i64,
    /// Phase 2. Ignored in v1.
    pub recipient: [u8; 32],
    /// Phase 2. Ignored in v1.
    pub category: u16,
}

/// Frozen `evaluate` body. Programs CPI into Policy Registry; tests call this
/// directly so P1–P3 cannot drift from on-chain behavior.
pub fn evaluate(policy: &Policy, input: EvaluateInput) -> Denial {
    if policy.revoked {
        return Denial::Revoked;
    }
    if policy.expires_at != 0 && input.now_unix >= policy.expires_at {
        return Denial::Expired;
    }
    if input.amount == 0 || input.amount > policy.per_call_cap {
        return Denial::PerCallCap;
    }
    let _ = (input.recipient, input.category);
    Denial::Allow
}
