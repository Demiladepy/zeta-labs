import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  DEVNET_USDC,
  PAYMENT_CHANNELS_PROGRAM_ID,
} from "../types.js";

/** Must match `crates/zeta-interface/src/paykit.rs`. */
export const OPEN_SLOT_WINDOW = 1500n;

export const PAYMENT_CHANNELS_IX = {
  open: 1,
  settle: 2,
  settleAndSeal: 4,
  distribute: 7,
} as const;

export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const RENT_SYSVAR_ID = "SysvarRent111111111111111111111111111111111";
export const CLOCK_SYSVAR_ID = "SysvarC1ock11111111111111111111111111111111";

/** Payment Channels devnet treasury (pay-kit canonical). */
export const DEVNET_TREASURY_OWNER =
  "4zTeC5mVqWLruDexgU2mV66p9t5vCA9JyiZqdGDUspap";

export const PAYKIT_DEFAULTS = {
  paymentChannelsProgramId: PAYMENT_CHANNELS_PROGRAM_ID,
  devnetUsdcMint: DEVNET_USDC,
  tokenProgramId: TOKEN_PROGRAM_ID.toBase58(),
  associatedTokenProgramId: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
  systemProgramId: SYSTEM_PROGRAM_ID,
  rentSysvarId: RENT_SYSVAR_ID,
  clockSysvarId: CLOCK_SYSVAR_ID,
} as const;
