//! Vault `draw` → Payment Channels `open`. This is the hot-path contract.
//!
//! Anurag: do not invent a parallel open. Build the pay-kit client against
//! [`DrawChannelSpec`].

use crate::instructions::DrawArgs;

/// Live Payment Channels program (mainnet + devnet).
pub const PAYMENT_CHANNELS_PROGRAM_ID: &str = crate::ids::PAYMENT_CHANNELS_ID_STR;

/// `open` discriminator (byte 0 of the instruction).
pub const PAYMENT_CHANNELS_OPEN_DISC: u8 = 1;
pub const PAYMENT_CHANNELS_SETTLE: u8 = 2;
pub const PAYMENT_CHANNELS_SETTLE_AND_SEAL: u8 = 4;
pub const PAYMENT_CHANNELS_DISTRIBUTE: u8 = 7;

/// What `draw` must pass into `open`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DrawChannelSpec {
    /// Pool PDA — token payer. Signs `open` via vault CPI.
    pub payer: [u8; 32],
    /// Pool USDC ATA.
    pub payer_token_account: [u8; 32],
    /// x402 operator / merchant (self-facilitating).
    pub payee: [u8; 32],
    /// Voucher author. v1: same as payee.
    pub authorized_signer: [u8; 32],
    pub mint: [u8; 32],
    /// Transaction fee / rent payer (agent or relayer).
    pub rent_payer: [u8; 32],
    pub deposit: u64,
    pub salt: u64,
    pub grace_period: u32,
    pub open_slot: u64,
}

impl DrawChannelSpec {
    pub fn from_draw(
        payer: [u8; 32],
        payer_token_account: [u8; 32],
        payee: [u8; 32],
        mint: [u8; 32],
        rent_payer: [u8; 32],
        args: DrawArgs,
    ) -> Result<Self, DrawSpecError> {
        if args.amount == 0 {
            return Err(DrawSpecError::DepositMustBeNonZero);
        }
        if args.grace_period < 1 {
            return Err(DrawSpecError::GracePeriodMustBeNonZero);
        }
        if payer == payee {
            return Err(DrawSpecError::PayerPayeeMustDiffer);
        }
        Ok(Self {
            payer,
            payer_token_account,
            payee,
            authorized_signer: payee,
            mint,
            rent_payer,
            deposit: args.amount,
            salt: args.salt,
            grace_period: args.grace_period,
            open_slot: args.open_slot,
        })
    }

    /// x402 `upto` verifier rule: channel deposit == advertised maxAmount.
    pub const fn matches_max_amount(&self, max_amount: u64) -> bool {
        self.deposit == max_amount
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DrawSpecError {
    DepositMustBeNonZero,
    GracePeriodMustBeNonZero,
    PayerPayeeMustDiffer,
}

/// Live program window: `open_slot` must be current-or-recent.
pub const OPEN_SLOT_WINDOW: u64 = 1_500;

/// `open` ix header after the discriminator: salt + deposit + grace + open_slot.
pub const PAYMENT_CHANNELS_OPEN_HEADER_LEN: usize = 8 + 8 + 4 + 8;
/// Disc + 28-byte header.
pub const PAYMENT_CHANNELS_OPEN_IX_HEADER_LEN: usize = 1 + PAYMENT_CHANNELS_OPEN_HEADER_LEN;
/// Canonical `open` account count from the pay-kit Codama client.
pub const PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT: usize = 14;

/// Packed AccountMeta used so zeta-interface stays Solana-SDK-free.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenAccountMeta {
    pub pubkey: [u8; 32],
    pub is_signer: bool,
    pub is_writable: bool,
}

/// 14 accounts for Payment Channels `open`, in program order.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PaymentChannelsOpenAccounts {
    pub payer: [u8; 32],
    pub rent_payer: [u8; 32],
    pub payee: [u8; 32],
    pub mint: [u8; 32],
    pub authorized_signer: [u8; 32],
    pub channel: [u8; 32],
    pub payer_token_account: [u8; 32],
    pub channel_token_account: [u8; 32],
    pub token_program: [u8; 32],
    pub system_program: [u8; 32],
    pub rent: [u8; 32],
    pub associated_token_program: [u8; 32],
    pub event_authority: [u8; 32],
    pub self_program: [u8; 32],
}

impl PaymentChannelsOpenAccounts {
    pub fn from_spec(
        spec: &DrawChannelSpec,
        channel: [u8; 32],
        channel_token_account: [u8; 32],
        token_program: [u8; 32],
        system_program: [u8; 32],
        rent: [u8; 32],
        associated_token_program: [u8; 32],
        event_authority: [u8; 32],
        self_program: [u8; 32],
    ) -> Self {
        Self {
            payer: spec.payer,
            rent_payer: spec.rent_payer,
            payee: spec.payee,
            mint: spec.mint,
            authorized_signer: spec.authorized_signer,
            channel,
            payer_token_account: spec.payer_token_account,
            channel_token_account,
            token_program,
            system_program,
            rent,
            associated_token_program,
            event_authority,
            self_program,
        }
    }

    /// Exact AccountMeta flags from pay-kit `Open::instruction`.
    pub fn metas(&self) -> [OpenAccountMeta; PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT] {
        [
            OpenAccountMeta { pubkey: self.payer, is_signer: true, is_writable: true },
            OpenAccountMeta { pubkey: self.rent_payer, is_signer: true, is_writable: true },
            OpenAccountMeta { pubkey: self.payee, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.mint, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.authorized_signer, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.channel, is_signer: false, is_writable: true },
            OpenAccountMeta { pubkey: self.payer_token_account, is_signer: false, is_writable: true },
            OpenAccountMeta { pubkey: self.channel_token_account, is_signer: false, is_writable: true },
            OpenAccountMeta { pubkey: self.token_program, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.system_program, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.rent, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.associated_token_program, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.event_authority, is_signer: false, is_writable: false },
            OpenAccountMeta { pubkey: self.self_program, is_signer: false, is_writable: false },
        ]
    }
}

/// `open` ix data: disc `1` ‖ salt ‖ deposit ‖ grace_period ‖ open_slot ‖ extra.
///
/// Extra is the client-built distribution preimage (Anurag / pay-kit).
pub fn encode_payment_channels_open(spec: &DrawChannelSpec, extra: &[u8]) -> Vec<u8> {
    let mut data = Vec::with_capacity(PAYMENT_CHANNELS_OPEN_IX_HEADER_LEN + extra.len());
    data.push(PAYMENT_CHANNELS_OPEN_DISC);
    data.extend_from_slice(&spec.salt.to_le_bytes());
    data.extend_from_slice(&spec.deposit.to_le_bytes());
    data.extend_from_slice(&spec.grace_period.to_le_bytes());
    data.extend_from_slice(&spec.open_slot.to_le_bytes());
    data.extend_from_slice(extra);
    data
}

/// `true` when `open_slot` is not in the future and is within [`OPEN_SLOT_WINDOW`].
pub const fn open_slot_is_recent(open_slot: u64, current_slot: u64) -> bool {
    match current_slot.checked_sub(open_slot) {
        Some(age) => age <= OPEN_SLOT_WINDOW,
        None => false,
    }
}
