//! Program IDs. Vault/Policy placeholders are replaced at first deploy.
//! Payment Channels is the live Solana Foundation program.

/// Base58 of the live Payment Channels program.
pub const PAYMENT_CHANNELS_ID_STR: &str = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";

/// Devnet USDC (Circle).
pub const DEVNET_USDC_STR: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/// 32-byte placeholder. First byte tags the program so tests can tell them apart.
pub const POLICY_REGISTRY_ID: [u8; 32] = {
    let mut id = [0u8; 32];
    id[0] = 0x50; // 'P'
    id
};

pub const CREDIT_VAULT_ID: [u8; 32] = {
    let mut id = [0u8; 32];
    id[0] = 0x56; // 'V'
    id
};
