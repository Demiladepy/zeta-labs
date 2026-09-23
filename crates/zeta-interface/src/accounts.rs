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

impl Pool {
    pub fn pack(&self) -> [u8; POOL_LEN] {
        let mut out = [0u8; POOL_LEN];
        out[0..8].copy_from_slice(&self.discriminator.to_le_bytes());
        out[8..40].copy_from_slice(&self.authority);
        out[40..72].copy_from_slice(&self.mint);
        out[72..104].copy_from_slice(&self.vault_ata);
        out[104..112].copy_from_slice(&self.deposited.to_le_bytes());
        out[112..120].copy_from_slice(&self.outstanding.to_le_bytes());
        out[120] = self.bump;
        out[121..128].copy_from_slice(&self._pad);
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < POOL_LEN {
            return None;
        }
        let discriminator = u64::from_le_bytes(data[0..8].try_into().ok()?);
        if discriminator != ACCOUNT_DISCRIMINATOR_POOL {
            return None;
        }
        Some(Self {
            discriminator,
            authority: data[8..40].try_into().ok()?,
            mint: data[40..72].try_into().ok()?,
            vault_ata: data[72..104].try_into().ok()?,
            deposited: u64::from_le_bytes(data[104..112].try_into().ok()?),
            outstanding: u64::from_le_bytes(data[112..120].try_into().ok()?),
            bump: data[120],
            _pad: data[121..128].try_into().ok()?,
        })
    }
}

impl CreditLine {
    pub fn pack(&self) -> [u8; CREDIT_LINE_LEN] {
        let mut out = [0u8; CREDIT_LINE_LEN];
        out[0..8].copy_from_slice(&self.discriminator.to_le_bytes());
        out[8..40].copy_from_slice(&self.pool);
        out[40..72].copy_from_slice(&self.agent);
        out[72..104].copy_from_slice(&self.policy);
        out[104..112].copy_from_slice(&self.limit.to_le_bytes());
        out[112..120].copy_from_slice(&self.drawn.to_le_bytes());
        out[120..128].copy_from_slice(&self.reserved.to_le_bytes());
        out[128] = self.bump;
        out[129..136].copy_from_slice(&self._pad);
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < CREDIT_LINE_LEN {
            return None;
        }
        let discriminator = u64::from_le_bytes(data[0..8].try_into().ok()?);
        if discriminator != ACCOUNT_DISCRIMINATOR_LINE {
            return None;
        }
        Some(Self {
            discriminator,
            pool: data[8..40].try_into().ok()?,
            agent: data[40..72].try_into().ok()?,
            policy: data[72..104].try_into().ok()?,
            limit: u64::from_le_bytes(data[104..112].try_into().ok()?),
            drawn: u64::from_le_bytes(data[112..120].try_into().ok()?),
            reserved: u64::from_le_bytes(data[120..128].try_into().ok()?),
            bump: data[128],
            _pad: data[129..136].try_into().ok()?,
        })
    }
}

impl Policy {
    pub fn pack(&self) -> [u8; POLICY_LEN] {
        let mut out = [0u8; POLICY_LEN];
        out[0..8].copy_from_slice(&self.discriminator.to_le_bytes());
        out[8..40].copy_from_slice(&self.issuer);
        out[40..48].copy_from_slice(&self.seed.to_le_bytes());
        out[48..56].copy_from_slice(&self.per_call_cap.to_le_bytes());
        out[56..64].copy_from_slice(&self.expires_at.to_le_bytes());
        out[64..72].copy_from_slice(&self.rolling_cap.to_le_bytes());
        out[72..80].copy_from_slice(&self.total_cap.to_le_bytes());
        out[80..82].copy_from_slice(&self.acl_version.to_le_bytes());
        out[82] = if self.revoked { 1 } else { 0 };
        out[83] = self.bump;
        out[84..96].copy_from_slice(&self._pad);
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < POLICY_LEN {
            return None;
        }
        let discriminator = u64::from_le_bytes(data[0..8].try_into().ok()?);
        if discriminator != ACCOUNT_DISCRIMINATOR_POLICY {
            return None;
        }
        Some(Self {
            discriminator,
            issuer: data[8..40].try_into().ok()?,
            seed: u64::from_le_bytes(data[40..48].try_into().ok()?),
            per_call_cap: u64::from_le_bytes(data[48..56].try_into().ok()?),
            expires_at: i64::from_le_bytes(data[56..64].try_into().ok()?),
            rolling_cap: u64::from_le_bytes(data[64..72].try_into().ok()?),
            total_cap: u64::from_le_bytes(data[72..80].try_into().ok()?),
            acl_version: u16::from_le_bytes(data[80..82].try_into().ok()?),
            revoked: data[82] != 0,
            bump: data[83],
            _pad: data[84..96].try_into().ok()?,
        })
    }
}

impl AuditRecord {
    pub const DISCRIMINATOR: u64 = 0x5A455441_41554454; // "ZETA" "AUDT"

    pub fn pack(&self) -> [u8; AUDIT_RECORD_LEN] {
        let mut out = [0u8; AUDIT_RECORD_LEN];
        out[0..8].copy_from_slice(&self.discriminator.to_le_bytes());
        out[8..40].copy_from_slice(&self.policy);
        out[40..72].copy_from_slice(&self.line);
        out[72..104].copy_from_slice(&self.agent);
        out[104..112].copy_from_slice(&self.amount.to_le_bytes());
        out[112] = if self.allowed { 1 } else { 0 };
        out[113] = self.denial;
        out[114..120].copy_from_slice(&self._pad);
        out[120..128].copy_from_slice(&self.slot.to_le_bytes());
        out[128..136].copy_from_slice(&self.unix_ts.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < AUDIT_RECORD_LEN {
            return None;
        }
        let discriminator = u64::from_le_bytes(data[0..8].try_into().ok()?);
        if discriminator != Self::DISCRIMINATOR {
            return None;
        }
        Some(Self {
            discriminator,
            policy: data[8..40].try_into().ok()?,
            line: data[40..72].try_into().ok()?,
            agent: data[72..104].try_into().ok()?,
            amount: u64::from_le_bytes(data[104..112].try_into().ok()?),
            allowed: data[112] != 0,
            denial: data[113],
            _pad: data[114..120].try_into().ok()?,
            slot: u64::from_le_bytes(data[120..128].try_into().ok()?),
            unix_ts: i64::from_le_bytes(data[128..136].try_into().ok()?),
        })
    }

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
