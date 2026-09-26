//! Frozen Day-1 contract for Vault, Policy, SDK, and the dashboard.
//!
//! Bump [`INTERFACE_VERSION`] only in a PR that all three owners ack.
//! v2: PolicyAcl + set_acl + evaluate P4 + DrawArgs.category.
//! v3: set_caps + LineUsage + evaluate P5 rolling/total.

pub mod accounts;
pub mod alloc;
pub mod builders;
pub mod denial;
pub mod evaluate;
pub mod ids;
pub mod instructions;
pub mod paykit;
pub mod seeds;

pub use accounts::{
    AuditRecord, CreditLine, LineUsage, Policy, PolicyAcl, Pool, ACCOUNT_DISCRIMINATOR_LINE,
    ACCOUNT_DISCRIMINATOR_LINE_USAGE, ACCOUNT_DISCRIMINATOR_POLICY, ACCOUNT_DISCRIMINATOR_POLICY_ACL,
    ACCOUNT_DISCRIMINATOR_POOL, AUDIT_RECORD_LEN, CREDIT_LINE_LEN, LINE_USAGE_LEN, POLICY_ACL_LEN,
    POLICY_ACL_MAX_RECIPIENTS, POLICY_LEN, POOL_LEN,
};
pub use alloc::{
    line_alloc_bytes, line_usage_alloc_bytes, policy_acl_alloc_bytes, policy_alloc_bytes,
    pool_alloc_bytes, PdaAlloc, LINE_ALLOC, LINE_USAGE_ALLOC, POLICY_ACL_ALLOC, POLICY_ALLOC,
    POOL_ALLOC,
};
pub use builders::{
    build_create_pool, build_deposit, build_deposit_with_transfer, build_draw,
    build_draw_with_acl, build_draw_with_channel_open, build_evaluate, build_evaluate_with_acl,
    build_open_line, build_register_policy, build_repay, build_revoke, build_set_acl,
    build_set_caps, IxShell, SYSTEM_PROGRAM_ID,
};
pub use denial::Denial;
pub use evaluate::{evaluate, EvaluateInput};
pub use instructions::{
    CreditVaultIx, DrawArgs, EvaluateArgs, OpenLineArgs, PolicyRegistryIx, RegisterPolicyArgs,
    RepayArgs, SetAclArgs, SetCapsArgs, CREATE_POOL_IX_LEN, DEPOSIT_IX_LEN, DRAW_ARGS_LEN,
    DRAW_IX_HEADER_LEN, EVALUATE_IX_LEN, OPEN_LINE_IX_LEN, POLICY_IX_EVALUATE, POLICY_IX_REGISTER,
    POLICY_IX_REVOKE, POLICY_IX_SET_ACL, POLICY_IX_SET_CAPS, REGISTER_POLICY_IX_LEN, REPAY_IX_LEN,
    REVOKE_IX_LEN, SET_ACL_IX_LEN, SET_CAPS_IX_LEN, VAULT_IX_CREATE_POOL, VAULT_IX_DEPOSIT,
    VAULT_IX_DRAW, VAULT_IX_OPEN_LINE, VAULT_IX_REPAY,
};
pub use paykit::{
    encode_payment_channels_open, open_slot_is_recent, DrawChannelSpec, DrawSpecError,
    OpenAccountMeta, PaymentChannelsOpenAccounts, OPEN_SLOT_WINDOW, PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT,
    PAYMENT_CHANNELS_OPEN_DISC, PAYMENT_CHANNELS_OPEN_HEADER_LEN, PAYMENT_CHANNELS_OPEN_IX_HEADER_LEN,
    PAYMENT_CHANNELS_PROGRAM_ID,
};
pub use seeds::{
    acl_seeds, channel_seeds, line_seeds, policy_seeds, pool_seeds, usage_seeds, ACL_SEED,
    CHANNEL_SEED, EVENT_AUTHORITY_SEED, LINE_SEED, POLICY_SEED, POOL_SEED, USAGE_SEED,
};

/// Monotonic. Bump on any layout or `evaluate` signature change.
/// v3 = set_caps + LineUsage + P5 rolling/total evaluate.
pub const INTERFACE_VERSION: u16 = 3;
