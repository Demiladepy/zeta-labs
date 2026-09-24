import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  PublicKey,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import type { DrawArgs, DrawChannelSpec, RepayArgs } from "../types.js";
import { VAULT_IX } from "../types.js";
import { concatBytes, writeU32LE, writeU64LE } from "./bytes.js";
import {
  DEVNET_TREASURY_OWNER,
  PAYKIT_DEFAULTS,
  PAYMENT_CHANNELS_IX,
} from "./constants.js";
import { encodeDistributionPreimage, type DistributionRecipient } from "./distribution.js";

const DRAW_IX_HEADER_LEN = 1 + 8 + 8 + 4 + 8;
const INSTRUCTIONS_SYSVAR_ID = "Sysvar1nstructions1111111111111111111111111";

export function encodeDrawArgs(draw: DrawArgs, distributionExtra: Uint8Array): Uint8Array {
  const out = new Uint8Array(DRAW_IX_HEADER_LEN + distributionExtra.length);
  out[0] = VAULT_IX.draw;
  writeU64LE(out, 1, draw.amount);
  writeU64LE(out, 9, draw.salt);
  writeU32LE(out, 17, draw.gracePeriod);
  writeU64LE(out, 21, draw.openSlot);
  out.set(distributionExtra, DRAW_IX_HEADER_LEN);
  return out;
}

/** Payment Channels `open` ix: disc ‖ header ‖ distribution preimage. */
export function encodePaymentChannelsOpen(
  spec: DrawChannelSpec,
  distributionExtra: Uint8Array,
): Uint8Array {
  const header = new Uint8Array(28);
  writeU64LE(header, 0, spec.salt);
  writeU64LE(header, 8, spec.deposit);
  writeU32LE(header, 16, spec.gracePeriod);
  writeU64LE(header, 20, spec.openSlot);
  return concatBytes(
    Uint8Array.of(PAYMENT_CHANNELS_IX.open),
    header,
    distributionExtra,
  );
}

export type BuildDrawWithChannelOpenParams = {
  creditVaultProgramId: PublicKey;
  paymentChannelsProgramId: PublicKey;
  agent: PublicKey;
  pool: PublicKey;
  line: PublicKey;
  policy: PublicKey;
  payee: PublicKey;
  rentPayer: PublicKey;
  clock: PublicKey;
  draw: DrawArgs;
  openAccounts: PublicKey[];
  distributionExtra: Uint8Array;
};

/** Vault `draw` with trailing Payment Channels CPI accounts. */
export function buildDrawWithChannelOpenInstruction(
  params: BuildDrawWithChannelOpenParams,
): TransactionInstruction {
  const {
    creditVaultProgramId,
    paymentChannelsProgramId,
    agent,
    pool,
    line,
    policy,
    payee,
    rentPayer,
    clock,
    draw,
    openAccounts,
    distributionExtra,
  } = params;

  if (openAccounts.length !== 14) {
    throw new Error(`expected 14 open accounts, got ${openAccounts.length}`);
  }
  const expectedOpenKeys: Array<[number, PublicKey, string]> = [
    [0, pool, "payer/pool"],
    [1, rentPayer, "rent payer"],
    [2, payee, "payee"],
    [4, payee, "authorized signer"],
    [13, paymentChannelsProgramId, "self program"],
  ];
  for (const [index, expected, role] of expectedOpenKeys) {
    if (!openAccounts[index]!.equals(expected)) {
      throw new Error(`Payment Channels open account ${index} must match ${role}`);
    }
  }

  const signerFlags = [
    // Outer instruction must not demand a pool-PDA signature. The vault's
    // invoke_signed supplies payer signer privilege only for the inner CPI.
    false,
    true,
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
  const writableFlags = [
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

  const keys: AccountMeta[] = [
    { pubkey: agent, isSigner: true, isWritable: false },
    { pubkey: pool, isSigner: false, isWritable: true },
    { pubkey: line, isSigner: false, isWritable: true },
    { pubkey: policy, isSigner: false, isWritable: false },
    { pubkey: payee, isSigner: false, isWritable: false },
    { pubkey: rentPayer, isSigner: true, isWritable: false },
    { pubkey: clock, isSigner: false, isWritable: false },
    { pubkey: paymentChannelsProgramId, isSigner: false, isWritable: false },
    ...openAccounts.map((pubkey, i) => ({
      pubkey,
      isSigner: signerFlags[i]!,
      isWritable: writableFlags[i]!,
    })),
  ];

  return new TransactionInstruction({
    programId: creditVaultProgramId,
    keys,
    data: Buffer.from(encodeDrawArgs(draw, distributionExtra)),
  });
}

export function buildRepayInstruction(args: {
  creditVaultProgramId: PublicKey;
  signer: PublicKey;
  pool: PublicKey;
  line: PublicKey;
  repay: RepayArgs;
}): TransactionInstruction {
  const data = new Uint8Array(1 + 16);
  data[0] = VAULT_IX.repay;
  writeU64LE(data, 1, args.repay.reservedThisDraw);
  writeU64LE(data, 9, args.repay.settled);
  return new TransactionInstruction({
    programId: args.creditVaultProgramId,
    keys: [
      { pubkey: args.signer, isSigner: true, isWritable: false },
      { pubkey: args.pool, isSigner: false, isWritable: true },
      { pubkey: args.line, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

export function buildSettleAndSealInstruction(args: {
  paymentChannelsProgramId: PublicKey;
  payee: PublicKey;
  channel: PublicKey;
  hasVoucher: boolean;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: args.paymentChannelsProgramId,
    keys: [
      { pubkey: args.payee, isSigner: true, isWritable: false },
      { pubkey: args.channel, isSigner: false, isWritable: true },
      {
        pubkey: new PublicKey(INSTRUCTIONS_SYSVAR_ID),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from([
      PAYMENT_CHANNELS_IX.settleAndSeal,
      args.hasVoucher ? 1 : 0,
    ]),
  });
}

export function buildDistributeInstruction(args: {
  paymentChannelsProgramId: PublicKey;
  channel: PublicKey;
  payer: PublicKey;
  rentPayer: PublicKey;
  channelTokenAccount: PublicKey;
  payerTokenAccount: PublicKey;
  payee: PublicKey;
  treasuryOwner: PublicKey;
  mint: PublicKey;
  tokenProgram: PublicKey;
  eventAuthority: PublicKey;
  distribution: readonly DistributionRecipient[];
}): TransactionInstruction {
  const preimage = encodeDistributionPreimage(args.distribution);
  const data = concatBytes(
    Uint8Array.of(PAYMENT_CHANNELS_IX.distribute),
    preimage,
  );

  const payeeTokenAccount = getAssociatedTokenAddressSync(
    args.mint,
    args.payee,
    true,
    args.tokenProgram,
  );
  const treasuryTokenAccount = getAssociatedTokenAddressSync(
    args.mint,
    args.treasuryOwner,
    true,
    args.tokenProgram,
  );

  const recipientAtas = args.distribution.map((entry) =>
    getAssociatedTokenAddressSync(
      args.mint,
      entry.recipient,
      true,
      args.tokenProgram,
    ),
  );

  const keys: AccountMeta[] = [
    { pubkey: args.channel, isSigner: false, isWritable: true },
    { pubkey: args.payer, isSigner: false, isWritable: true },
    { pubkey: args.rentPayer, isSigner: false, isWritable: true },
    { pubkey: args.channelTokenAccount, isSigner: false, isWritable: true },
    { pubkey: args.payerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: payeeTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: args.mint, isSigner: false, isWritable: false },
    { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: args.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: args.paymentChannelsProgramId, isSigner: false, isWritable: false },
    ...recipientAtas.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    })),
  ];

  return new TransactionInstruction({
    programId: args.paymentChannelsProgramId,
    keys,
    data: Buffer.from(data),
  });
}

export function devnetTreasuryOwner(): PublicKey {
  return new PublicKey(DEVNET_TREASURY_OWNER);
}

export function defaultTokenProgram(): PublicKey {
  return new PublicKey(PAYKIT_DEFAULTS.tokenProgramId);
}
