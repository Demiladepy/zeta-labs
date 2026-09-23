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
