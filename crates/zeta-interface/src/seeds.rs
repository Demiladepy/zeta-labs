pub const POOL_SEED: &[u8] = b"pool";
pub const LINE_SEED: &[u8] = b"line";
pub const POLICY_SEED: &[u8] = b"policy";

/// `["pool", authority, mint]`
pub fn pool_seeds<'a>(authority: &'a [u8; 32], mint: &'a [u8; 32]) -> [&'a [u8]; 3] {
    [POOL_SEED, authority.as_slice(), mint.as_slice()]
}

/// `["line", pool, agent]`
pub fn line_seeds<'a>(pool: &'a [u8; 32], agent: &'a [u8; 32]) -> [&'a [u8]; 3] {
    [LINE_SEED, pool.as_slice(), agent.as_slice()]
}

/// `["policy", issuer, seed]`
pub fn policy_seeds<'a>(issuer: &'a [u8; 32], seed: &'a [u8; 8]) -> [&'a [u8]; 3] {
    [POLICY_SEED, issuer.as_slice(), seed.as_slice()]
}

pub const CHANNEL_SEED: &[u8] = b"channel";
pub const EVENT_AUTHORITY_SEED: &[u8] = b"event_authority";

/// Payment Channels PDA: `["channel", payer, payee, mint, authorized_signer, salt, open_slot]`.
pub fn channel_seeds<'a>(
    payer: &'a [u8; 32],
    payee: &'a [u8; 32],
    mint: &'a [u8; 32],
    authorized_signer: &'a [u8; 32],
    salt: &'a [u8; 8],
    open_slot: &'a [u8; 8],
) -> [&'a [u8]; 7] {
    [
        CHANNEL_SEED,
        payer.as_slice(),
        payee.as_slice(),
        mint.as_slice(),
        authorized_signer.as_slice(),
        salt.as_slice(),
        open_slot.as_slice(),
    ]
}
