//! Frozen Day-1 contract for Vault, Policy, SDK, and the dashboard.
//!
//! Bump [`INTERFACE_VERSION`] only in a PR that all three owners ack.

pub mod accounts;
pub mod denial;
pub mod evaluate;
pub mod ids;
pub mod instructions;
pub mod paykit;
pub mod seeds;

pub use accounts::{
    AuditRecord, CreditLine, Policy, Pool, ACCOUNT_DISCRIMINATOR_LINE, ACCOUNT_DISCRIMINATOR_POLICY,
    ACCOUNT_DISCRIMINATOR_POOL, AUDIT_RECORD_LEN, CREDIT_LINE_LEN, POLICY_LEN, POOL_LEN,
};
pub use denial::Denial;
pub use evaluate::{evaluate, EvaluateInput};
pub use instructions::{
    CreditVaultIx, DrawArgs, EvaluateArgs, OpenLineArgs, PolicyRegistryIx, RegisterPolicyArgs,
    RepayArgs,
};
pub use paykit::{
    DrawChannelSpec, DrawSpecError, PAYMENT_CHANNELS_OPEN_DISC, PAYMENT_CHANNELS_PROGRAM_ID,
};
pub use seeds::{line_seeds, policy_seeds, pool_seeds};

/// Monotonic. Bump on any layout or `evaluate` signature change.
pub const INTERFACE_VERSION: u16 = 1;
