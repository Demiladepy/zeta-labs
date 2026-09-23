//! Program IDs. Vault/Policy placeholders are replaced at first deploy.
//! Payment Channels is the live Solana Foundation program.

/// Base58 of the live Payment Channels program.
pub const PAYMENT_CHANNELS_ID_STR: &str = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";

/// Placeholder base58 — replace with the first deploy keypair pubkey.
pub const POLICY_REGISTRY_ID_STR: &str = "Pol1cyReg1stry11111111111111111111111111111";
pub const CREDIT_VAULT_ID_STR: &str = "Cred1tVau1t1111111111111111111111111111111";

pub const TOKEN_PROGRAM_ID_STR: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub const ASSOCIATED_TOKEN_PROGRAM_ID_STR: &str = "ATokenGPvbdGVxr1b2hvZbsiwW5xWH25efTNsLJA8knL";
pub const SYSTEM_PROGRAM_ID_STR: &str = "11111111111111111111111111111111";
pub const RENT_SYSVAR_ID_STR: &str = "SysvarRent111111111111111111111111111111111";
pub const CLOCK_SYSVAR_ID_STR: &str = "SysvarC1ock11111111111111111111111111111111";

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
