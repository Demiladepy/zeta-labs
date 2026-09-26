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
    /// Line `drawn` (settled lifetime). Used when `total_cap != 0`.
    pub line_drawn: u64,
    /// Line `reserved` (in-flight). Used when `total_cap != 0`.
    pub line_reserved: u64,
    /// Current window spend from `LineUsage` (pre-reset). Used when `rolling_cap != 0`.
    pub rolling_spent: u64,
    /// `LineUsage.window_start` (`0` = never started). Used when `rolling_cap != 0`.
    pub window_start: i64,
}

/// Frozen `evaluate` body. Vault and Policy Registry call the same function
/// so P1–P5 cannot drift.
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
    if policy.rolling_cap != 0 {
        if policy.rolling_window_secs == 0 {
            return Denial::RollingCap;
        }
        let effective = if input.window_start == 0
            || input
                .now_unix
                .saturating_sub(input.window_start)
                >= policy.rolling_window_secs as i64
        {
            0
        } else {
            input.rolling_spent
        };
        if effective.saturating_add(input.amount) > policy.rolling_cap {
            return Denial::RollingCap;
        }
    }
    if policy.total_cap != 0 {
        let used = input.line_drawn.saturating_add(input.line_reserved);
        if used.saturating_add(input.amount) > policy.total_cap {
            return Denial::TotalCap;
        }
    }
    if policy.acl_version != 0 {
        match input.acl_allows {
            Some(true) => {}
            _ => return Denial::NotAllowlisted,
        }
    }
    let _ = (input.recipient, input.category);
    Denial::Allow
}
