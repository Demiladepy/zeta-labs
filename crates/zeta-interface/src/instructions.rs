//! Instruction discriminators and argument layouts. First byte is the tag.

use crate::denial::Denial;

pub const POLICY_IX_REGISTER: u8 = 0;
pub const POLICY_IX_EVALUATE: u8 = 1;
pub const POLICY_IX_REVOKE: u8 = 2;

pub const VAULT_IX_CREATE_POOL: u8 = 0;
pub const VAULT_IX_DEPOSIT: u8 = 1;
pub const VAULT_IX_OPEN_LINE: u8 = 2;
pub const VAULT_IX_DRAW: u8 = 3;
pub const VAULT_IX_REPAY: u8 = 4;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyRegistryIx {
    RegisterPolicy(RegisterPolicyArgs),
    Evaluate(EvaluateArgs),
    Revoke,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CreditVaultIx {
    CreatePool,
    Deposit { amount: u64 },
    OpenLine(OpenLineArgs),
    Draw(DrawArgs),
    Repay(RepayArgs),
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RegisterPolicyArgs {
    pub seed: u64,
    pub per_call_cap: u64,
    pub expires_at: i64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EvaluateArgs {
    pub amount: u64,
    pub recipient: [u8; 32],
    pub category: u16,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenLineArgs {
    pub limit: u64,
}

/// Maps 1:1 onto Payment Channels `open` header fields that the vault
/// is allowed to choose. Distribution preimage is built by the client
/// (Anurag / pay-kit) and passed as remaining accounts + extra data.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DrawArgs {
    pub amount: u64,
    pub salt: u64,
    pub grace_period: u32,
    pub open_slot: u64,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RepayArgs {
    pub reserved_this_draw: u64,
    pub settled: u64,
}

impl EvaluateArgs {
    pub fn denial_if_zero_amount(&self) -> Option<Denial> {
        if self.amount == 0 {
            Some(Denial::PerCallCap)
        } else {
            None
        }
    }
}

pub const REGISTER_POLICY_IX_LEN: usize = 1 + 8 + 8 + 8;
pub const EVALUATE_IX_LEN: usize = 1 + 8 + 32 + 2;
pub const REVOKE_IX_LEN: usize = 1;
pub const CREATE_POOL_IX_LEN: usize = 1;
pub const DEPOSIT_IX_LEN: usize = 1 + 8;
pub const OPEN_LINE_IX_LEN: usize = 1 + 8;
pub const DRAW_IX_HEADER_LEN: usize = 1 + 8 + 8 + 4 + 8;
pub const REPAY_IX_LEN: usize = 1 + 8 + 8;

impl RegisterPolicyArgs {
    pub fn pack(&self) -> [u8; 24] {
        let mut out = [0u8; 24];
        out[0..8].copy_from_slice(&self.seed.to_le_bytes());
        out[8..16].copy_from_slice(&self.per_call_cap.to_le_bytes());
        out[16..24].copy_from_slice(&self.expires_at.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < 24 {
            return None;
        }
        Some(Self {
            seed: u64::from_le_bytes(data[0..8].try_into().ok()?),
            per_call_cap: u64::from_le_bytes(data[8..16].try_into().ok()?),
            expires_at: i64::from_le_bytes(data[16..24].try_into().ok()?),
        })
    }
}

impl EvaluateArgs {
    pub fn pack(&self) -> [u8; 42] {
        let mut out = [0u8; 42];
        out[0..8].copy_from_slice(&self.amount.to_le_bytes());
        out[8..40].copy_from_slice(&self.recipient);
        out[40..42].copy_from_slice(&self.category.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < 42 {
            return None;
        }
        Some(Self {
            amount: u64::from_le_bytes(data[0..8].try_into().ok()?),
            recipient: data[8..40].try_into().ok()?,
            category: u16::from_le_bytes(data[40..42].try_into().ok()?),
        })
    }
}

impl OpenLineArgs {
    pub fn pack(&self) -> [u8; 8] {
        self.limit.to_le_bytes()
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < 8 {
            return None;
        }
        Some(Self {
            limit: u64::from_le_bytes(data[0..8].try_into().ok()?),
        })
    }
}

impl DrawArgs {
    pub fn pack(&self) -> [u8; 28] {
        let mut out = [0u8; 28];
        out[0..8].copy_from_slice(&self.amount.to_le_bytes());
        out[8..16].copy_from_slice(&self.salt.to_le_bytes());
        out[16..20].copy_from_slice(&self.grace_period.to_le_bytes());
        out[20..28].copy_from_slice(&self.open_slot.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < 28 {
            return None;
        }
        Some(Self {
            amount: u64::from_le_bytes(data[0..8].try_into().ok()?),
            salt: u64::from_le_bytes(data[8..16].try_into().ok()?),
            grace_period: u32::from_le_bytes(data[16..20].try_into().ok()?),
            open_slot: u64::from_le_bytes(data[20..28].try_into().ok()?),
        })
    }
}

impl RepayArgs {
    pub fn pack(&self) -> [u8; 16] {
        let mut out = [0u8; 16];
        out[0..8].copy_from_slice(&self.reserved_this_draw.to_le_bytes());
        out[8..16].copy_from_slice(&self.settled.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Option<Self> {
        if data.len() < 16 {
            return None;
        }
        Some(Self {
            reserved_this_draw: u64::from_le_bytes(data[0..8].try_into().ok()?),
            settled: u64::from_le_bytes(data[8..16].try_into().ok()?),
        })
    }
}

impl PolicyRegistryIx {
    pub fn decode(data: &[u8]) -> Option<Self> {
        let tag = *data.first()?;
        let rest = &data[1..];
        match tag {
            POLICY_IX_REGISTER => Some(Self::RegisterPolicy(RegisterPolicyArgs::unpack(rest)?)),
            POLICY_IX_EVALUATE => Some(Self::Evaluate(EvaluateArgs::unpack(rest)?)),
            POLICY_IX_REVOKE => Some(Self::Revoke),
            _ => None,
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        match self {
            Self::RegisterPolicy(args) => {
                let mut out = Vec::with_capacity(REGISTER_POLICY_IX_LEN);
                out.push(POLICY_IX_REGISTER);
                out.extend_from_slice(&args.pack());
                out
            }
            Self::Evaluate(args) => {
                let mut out = Vec::with_capacity(EVALUATE_IX_LEN);
                out.push(POLICY_IX_EVALUATE);
                out.extend_from_slice(&args.pack());
                out
            }
            Self::Revoke => vec![POLICY_IX_REVOKE],
        }
    }
}

impl CreditVaultIx {
    /// `draw` may carry a trailing distribution preimage after the 29-byte header.
    pub fn decode(data: &[u8]) -> Option<(Self, &[u8])> {
        let tag = *data.first()?;
        let rest = &data[1..];
        match tag {
            VAULT_IX_CREATE_POOL => Some((Self::CreatePool, rest)),
            VAULT_IX_DEPOSIT => {
                if rest.len() < 8 {
                    return None;
                }
                let amount = u64::from_le_bytes(rest[0..8].try_into().ok()?);
                Some((Self::Deposit { amount }, &rest[8..]))
            }
            VAULT_IX_OPEN_LINE => Some((Self::OpenLine(OpenLineArgs::unpack(rest)?), &rest[8.min(rest.len())..])),
            VAULT_IX_DRAW => {
                let args = DrawArgs::unpack(rest)?;
                Some((Self::Draw(args), &rest[28.min(rest.len())..]))
            }
            VAULT_IX_REPAY => Some((Self::Repay(RepayArgs::unpack(rest)?), &rest[16.min(rest.len())..])),
            _ => None,
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        match self {
            Self::CreatePool => vec![VAULT_IX_CREATE_POOL],
            Self::Deposit { amount } => {
                let mut out = Vec::with_capacity(DEPOSIT_IX_LEN);
                out.push(VAULT_IX_DEPOSIT);
                out.extend_from_slice(&amount.to_le_bytes());
                out
            }
            Self::OpenLine(args) => {
                let mut out = Vec::with_capacity(OPEN_LINE_IX_LEN);
                out.push(VAULT_IX_OPEN_LINE);
                out.extend_from_slice(&args.pack());
                out
            }
            Self::Draw(args) => {
                let mut out = Vec::with_capacity(DRAW_IX_HEADER_LEN);
                out.push(VAULT_IX_DRAW);
                out.extend_from_slice(&args.pack());
                out
            }
            Self::Repay(args) => {
                let mut out = Vec::with_capacity(REPAY_IX_LEN);
                out.push(VAULT_IX_REPAY);
                out.extend_from_slice(&args.pack());
                out
            }
        }
    }

    pub fn encode_draw(args: DrawArgs, distribution_extra: &[u8]) -> Vec<u8> {
        let mut out = Self::Draw(args).encode();
        out.extend_from_slice(distribution_extra);
        out
    }
}
