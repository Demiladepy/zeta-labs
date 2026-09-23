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

#[derive(Clone, Copy, Debug)]
pub enum PolicyRegistryIx {
    RegisterPolicy(RegisterPolicyArgs),
    Evaluate(EvaluateArgs),
    Revoke,
}

#[derive(Clone, Copy, Debug)]
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
