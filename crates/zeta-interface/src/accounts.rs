//! Fixed layouts. Field order is the wire order. Do not reorder.

use crate::denial::Denial;

pub const ACCOUNT_DISCRIMINATOR_POOL: u64 = 0x5A455441_504F4F4C; // "ZETA" "POOL"
pub const ACCOUNT_DISCRIMINATOR_LINE: u64 = 0x5A455441_4C494E45; // "ZETA" "LINE"
pub const ACCOUNT_DISCRIMINATOR_POLICY: u64 = 0x5A455441_504F4C59; // "ZETA" "POLY"

/// `8 + 32 + 32 + 32 + 8 + 8 + 1 + 7 pad = 128`
pub const POOL_LEN: usize = 128;
/// `8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 7 pad = 136`
pub const CREDIT_LINE_LEN: usize = 136;
/// 96-byte reserved layout. Trailing pad is Phase-2 room.
pub const POLICY_LEN: usize = 96;
/// Event payload. Includes 6 bytes of alignment pad after the flags.
pub const AUDIT_RECORD_LEN: usize = 136;

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Pool {
    pub discriminator: u64,
    pub authority: [u8; 32],
    pub mint: [u8; 32],
    pub vault_ata: [u8; 32],
    pub deposited: u64,
    pub outstanding: u64,
    pub bump: u8,
    pub _pad: [u8; 7],
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CreditLine {
    pub discriminator: u64,
    pub pool: [u8; 32],
    pub agent: [u8; 32],
    pub policy: [u8; 32],
    pub limit: u64,
    pub drawn: u64,
    pub reserved: u64,
    pub bump: u8,
    pub _pad: [u8; 7],
}

impl CreditLine {
    /// P1: a new draw of `amount` must fit under the unused line.
    pub const fn can_draw(&self, amount: u64) -> bool {
        match self.limit.checked_sub(self.drawn) {
            Some(headroom) => match headroom.checked_sub(self.reserved) {
                Some(free) => free >= amount && amount > 0,
                None => false,
            },
            None => false,
        }
    }

    pub fn reserve(&mut self, amount: u64) -> bool {
        if !self.can_draw(amount) {
            return false;
        }
        self.reserved += amount;
        true
    }

    /// After Payment Channels `distribute`. `reserved_this_draw` is the
    /// ceiling that was locked on `draw`; `settled` is the voucher watermark.
    pub fn repay(&mut self, reserved_this_draw: u64, settled: u64) -> bool {
        if settled > reserved_this_draw || self.reserved < reserved_this_draw {
            return false;
        }
        self.reserved -= reserved_this_draw;
        self.drawn = match self.drawn.checked_add(settled) {
            Some(v) => v,
            None => return false,
        };
        true
    }
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Policy {
    pub discriminator: u64,
    pub issuer: [u8; 32],
    pub seed: u64,
    pub per_call_cap: u64,
    pub expires_at: i64,
    /// Phase 2. `0` = unused.
    pub rolling_cap: u64,
    /// Phase 2. `0` = unused.
    pub total_cap: u64,
    /// Phase 2 Token ACL version. `0` = unused.
    pub acl_version: u16,
    pub revoked: bool,
    pub bump: u8,
    pub _pad: [u8; 12],
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AuditRecord {
    pub discriminator: u64,
    pub policy: [u8; 32],
    pub line: [u8; 32],
    pub agent: [u8; 32],
    pub amount: u64,
    pub allowed: bool,
    pub denial: u8,
    pub _pad: [u8; 6],
    pub slot: u64,
    pub unix_ts: i64,
}

impl AuditRecord {
    pub const DISCRIMINATOR: u64 = 0x5A455441_41554454; // "ZETA" "AUDT"

    pub fn new(
        policy: [u8; 32],
        line: [u8; 32],
        agent: [u8; 32],
        amount: u64,
        denial: Denial,
        slot: u64,
        unix_ts: i64,
    ) -> Self {
        Self {
            discriminator: Self::DISCRIMINATOR,
            policy,
            line,
            agent,
            amount,
            allowed: denial.is_allow(),
            denial: denial.as_u8(),
            _pad: [0; 6],
            slot,
            unix_ts,
        }
    }
}

const fn assert_layout() {
    assert!(core::mem::size_of::<Pool>() == POOL_LEN);
    assert!(core::mem::size_of::<CreditLine>() == CREDIT_LINE_LEN);
    assert!(core::mem::size_of::<Policy>() == POLICY_LEN);
    assert!(core::mem::size_of::<AuditRecord>() == AUDIT_RECORD_LEN);
}

const _: () = assert_layout();
