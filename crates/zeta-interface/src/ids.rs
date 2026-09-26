//! Program IDs. Vault/Policy match keypairs in `.keys/` (gitignored).
//! Payment Channels is the live Solana Foundation program.

/// Base58 of the live Payment Channels program.
pub const PAYMENT_CHANNELS_ID_STR: &str = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";

/// Bytes for `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`.
pub const PAYMENT_CHANNELS_ID: [u8; 32] = [
    167, 161, 251, 164, 235, 43, 9, 9, 147, 247, 210, 223, 214, 43, 137, 226, 184, 114, 7, 122, 99,
    159, 215, 215, 71, 168, 233, 159, 99, 212, 21, 174,
];

/// From `.keys/policy-registry-keypair.json` — live on Devnet.
pub const POLICY_REGISTRY_ID_STR: &str = "G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk";

/// From `.keys/credit-vault-keypair.json` — live on Devnet.
pub const CREDIT_VAULT_ID_STR: &str = "4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi";

pub const TOKEN_PROGRAM_ID_STR: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub const ASSOCIATED_TOKEN_PROGRAM_ID_STR: &str = "ATokenGPvbdGVxr1b2hvZbsiwW5xWH25efTNsLJA8knL";
pub const SYSTEM_PROGRAM_ID_STR: &str = "11111111111111111111111111111111";
pub const RENT_SYSVAR_ID_STR: &str = "SysvarRent111111111111111111111111111111111";
pub const CLOCK_SYSVAR_ID_STR: &str = "SysvarC1ock11111111111111111111111111111111";

/// Devnet USDC (Circle).
pub const DEVNET_USDC_STR: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/// Bytes for `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk`.
pub const POLICY_REGISTRY_ID: [u8; 32] = [
    222, 244, 152, 220, 241, 215, 11, 107, 102, 73, 225, 22, 238, 117, 98, 137, 121, 164, 222, 35,
    3, 186, 16, 90, 126, 173, 187, 180, 145, 131, 167, 141,
];

/// Bytes for `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi`.
pub const CREDIT_VAULT_ID: [u8; 32] = [
    49, 188, 116, 226, 123, 60, 115, 186, 166, 114, 85, 194, 228, 8, 203, 137, 243, 47, 62, 89,
    236, 44, 5, 70, 117, 246, 10, 206, 222, 141, 62, 25,
];