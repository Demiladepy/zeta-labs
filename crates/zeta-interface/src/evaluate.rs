//! Ordered policy checks. First failure wins. Always pair with an AuditRecord.

use crate::accounts::Policy;
use crate::denial::Denial;

#[derive(Clone, Copy, Debug)]
pub struct EvaluateInput {
    pub amount: u64,
    pub now_unix: i64,
    pub recipient: [u8; 32],
    pub category: u16,
    /// When `policy.acl_version != 0`, processors set this after reading the
    /// sibling `PolicyAcl` PDA (`Some(true)` = allowlisted). `None` or
    /// `Some(false)` → `NotAllowlisted`. Ignored when `acl_version == 0`.
    pub acl_allows: Option<bool>,
}

/// Frozen `evaluate` body. Vault and Policy Registry call the same function
/// so P1–P4 cannot drift. P5 rolling/total caps remain reserved (unused).
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
    // P5 placeholders: rolling_cap / total_cap still ignored when nonzero.
    if policy.acl_version != 0 {
        match input.acl_allows {
            Some(true) => {}
            _ => return Denial::NotAllowlisted,
        }
    }
    let _ = (input.recipient, input.category);
    Denial::Allow
}
