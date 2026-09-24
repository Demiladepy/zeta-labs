import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { DrawArgs, DrawChannelSpec } from "../types.js";
import { PAYKIT_DEFAULTS } from "./constants.js";
import { encodeDistributionPreimage, type DistributionRecipient } from "./distribution.js";
import { writeU64LE } from "./bytes.js";

export type ChannelOpenParams = {
  /** Pool PDA — vault token payer. */
  payer: PublicKey;
  /** Pool USDC ATA. */
  payerTokenAccount: PublicKey;
  /** x402 operator / merchant. */
  payee: PublicKey;
  mint: PublicKey;
  /** Agent or relayer — pays SOL rent for channel + escrow ATA. */
  rentPayer: PublicKey;
  draw: DrawArgs;
  distribution?: readonly DistributionRecipient[];
  paymentChannelsProgramId?: PublicKey;
  tokenProgramId?: PublicKey;
};

export type PaymentChannelsOpenLayout = {
  spec: DrawChannelSpec;
  distributionExtra: Uint8Array;
  channel: PublicKey;
  channelTokenAccount: PublicKey;
  eventAuthority: PublicKey;
  accounts: {
    payer: PublicKey;
    rentPayer: PublicKey;
    payee: PublicKey;
    mint: PublicKey;
    authorizedSigner: PublicKey;
    channel: PublicKey;
    payerTokenAccount: PublicKey;
    channelTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    systemProgram: PublicKey;
    rent: PublicKey;
    associatedTokenProgram: PublicKey;
    eventAuthority: PublicKey;
    selfProgram: PublicKey;
  };
  /** 14 account pubkeys in Payment Channels `open` order. */
  openAccountPubkeys: PublicKey[];
  /** Outer vault-instruction signer flags; payer is elevated only inside CPI. */
  openSigners: boolean[];
  /** Matching writable flags for `buildDrawWithChannelOpen`. */
  openWritable: boolean[];
};

function u64Seed(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  writeU64LE(out, 0, value);
  return out;
}

export function findPaymentChannelPda(args: {
  payer: PublicKey;
  payee: PublicKey;
  mint: PublicKey;
  authorizedSigner: PublicKey;
  salt: bigint;
  openSlot: bigint;
  programId?: PublicKey;
}): PublicKey {
  const programId =
    args.programId ??
    new PublicKey(PAYKIT_DEFAULTS.paymentChannelsProgramId);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("channel"),
      args.payer.toBytes(),
      args.payee.toBytes(),
      args.mint.toBytes(),
      args.authorizedSigner.toBytes(),
      u64Seed(args.salt),
      u64Seed(args.openSlot),
    ],
    programId,
  )[0];
}

export function findEventAuthorityPda(programId?: PublicKey): PublicKey {
  const channels =
    programId ?? new PublicKey(PAYKIT_DEFAULTS.paymentChannelsProgramId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("event_authority")],
    channels,
  )[0];
}

/**
 * Build `DrawChannelSpec` + the 14 `open` accounts for vault `draw` CPI.
 * v1: `authorizedSigner` == `payee` (self-facilitating operator).
 */
export function buildChannelOpenLayout(
  params: ChannelOpenParams,
): PaymentChannelsOpenLayout {
  const {
    payer,
    payerTokenAccount,
    payee,
    mint,
    rentPayer,
    draw,
    distribution = [],
    paymentChannelsProgramId = new PublicKey(
      PAYKIT_DEFAULTS.paymentChannelsProgramId,
    ),
    tokenProgramId = new PublicKey(PAYKIT_DEFAULTS.tokenProgramId),
  } = params;

  if (draw.amount <= 0n) {
    throw new Error("draw.amount must be > 0");
  }
  if (draw.gracePeriod < 1) {
    throw new Error("draw.gracePeriod must be >= 1");
  }
  if (payer.equals(payee)) {
    throw new Error("payer and payee must differ");
  }

  const authorizedSigner = payee;
  const distributionExtra = encodeDistributionPreimage(distribution);
  const channel = findPaymentChannelPda({
    payer,
    payee,
    mint,
    authorizedSigner,
    salt: draw.salt,
    openSlot: draw.openSlot,
    programId: paymentChannelsProgramId,
  });
  const channelTokenAccount = getAssociatedTokenAddressSync(
    mint,
    channel,
    true,
    tokenProgramId,
  );
  const eventAuthority = findEventAuthorityPda(paymentChannelsProgramId);

  const accounts = {
    payer,
    rentPayer,
    payee,
    mint,
    authorizedSigner,
    channel,
    payerTokenAccount,
    channelTokenAccount,
    tokenProgram: tokenProgramId,
    systemProgram: new PublicKey(PAYKIT_DEFAULTS.systemProgramId),
    rent: new PublicKey(PAYKIT_DEFAULTS.rentSysvarId),
    associatedTokenProgram: new PublicKey(
      PAYKIT_DEFAULTS.associatedTokenProgramId,
    ),
    eventAuthority,
    selfProgram: paymentChannelsProgramId,
  };

  const openAccountPubkeys = [
    accounts.payer,
    accounts.rentPayer,
    accounts.payee,
    accounts.mint,
    accounts.authorizedSigner,
    accounts.channel,
    accounts.payerTokenAccount,
    accounts.channelTokenAccount,
    accounts.tokenProgram,
    accounts.systemProgram,
    accounts.rent,
    accounts.associatedTokenProgram,
    accounts.eventAuthority,
    accounts.selfProgram,
  ];

  const openSigners = [
    // Outer vault instruction: the pool PDA is not a transaction signer.
    // Credit Vault marks it as an inner signer through invoke_signed.
    false,
    true, // rent_payer
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ];

  const openWritable = [
    true,
    true,
    false,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
  ];

  const spec: DrawChannelSpec = {
    payer: payer.toBytes(),
    payerTokenAccount: payerTokenAccount.toBytes(),
    payee: payee.toBytes(),
    authorizedSigner: authorizedSigner.toBytes(),
    mint: mint.toBytes(),
    rentPayer: rentPayer.toBytes(),
    deposit: draw.amount,
    salt: draw.salt,
    gracePeriod: draw.gracePeriod,
    openSlot: draw.openSlot,
  };

  return {
    spec,
    distributionExtra,
    channel,
    channelTokenAccount,
    eventAuthority,
    accounts,
    openAccountPubkeys,
    openSigners,
    openWritable,
  };
}

/** x402 `upto`: channel deposit must equal advertised maxAmount. */
export function matchesX402MaxAmount(deposit: bigint, maxAmount: bigint): boolean {
  return deposit === maxAmount;
}
