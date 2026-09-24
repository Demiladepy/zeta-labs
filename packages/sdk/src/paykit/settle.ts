import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { RepayArgs } from "../types.js";
import { CREDIT_VAULT_PROGRAM_ID } from "../types.js";
import { findEventAuthorityPda } from "./channel.js";
import {
  buildDistributeInstruction,
  buildRepayInstruction,
  buildSettleAndSealInstruction,
  devnetTreasuryOwner,
  defaultTokenProgram,
} from "./instructions.js";
import type { DistributionRecipient } from "./distribution.js";

export type OperatorSettlePlan = {
  settleAndSeal: TransactionInstruction;
  distribute: TransactionInstruction;
  repay: TransactionInstruction;
  settled: bigint;
};

export type OperatorSettleParams = {
  paymentChannelsProgramId: PublicKey;
  creditVaultProgramId?: PublicKey;
  channel: PublicKey;
  payer: PublicKey;
  rentPayer: PublicKey;
  payee: PublicKey;
  mint: PublicKey;
  channelTokenAccount: PublicKey;
  payerTokenAccount: PublicKey;
  /** Vault line + pool for `repay`. */
  line: PublicKey;
  pool: PublicKey;
  repaySigner: PublicKey;
  reservedThisDraw: bigint;
  settled: bigint;
  distribution?: readonly DistributionRecipient[];
  tokenProgram?: PublicKey;
  treasuryOwner?: PublicKey;
  /** Set true when the tx bundles an Ed25519 voucher precompile before settle. */
  hasVoucher?: boolean;
};

/**
 * Operator path after metering: settle_and_seal → distribute → vault repay.
 * Voucher signing / Ed25519 precompile bundling is operator-side (pay-kit server).
 */
export function planOperatorSettle(params: OperatorSettleParams): OperatorSettlePlan {
  if (params.reservedThisDraw <= 0n) {
    throw new Error("reservedThisDraw must be positive");
  }
  if (params.settled < 0n || params.settled > params.reservedThisDraw) {
    throw new Error("settled must be between zero and reservedThisDraw");
  }
  const tokenProgram = params.tokenProgram ?? defaultTokenProgram();
  const eventAuthority = findEventAuthorityPda(params.paymentChannelsProgramId);
  const distribution = params.distribution ?? [];

  const settleAndSeal = buildSettleAndSealInstruction({
    paymentChannelsProgramId: params.paymentChannelsProgramId,
    payee: params.payee,
    channel: params.channel,
    hasVoucher: params.hasVoucher ?? true,
  });

  const distribute = buildDistributeInstruction({
    paymentChannelsProgramId: params.paymentChannelsProgramId,
    channel: params.channel,
    payer: params.payer,
    rentPayer: params.rentPayer,
    channelTokenAccount: params.channelTokenAccount,
    payerTokenAccount: params.payerTokenAccount,
    payee: params.payee,
    treasuryOwner: params.treasuryOwner ?? devnetTreasuryOwner(),
    mint: params.mint,
    tokenProgram,
    eventAuthority,
    distribution,
  });

  const repay: RepayArgs = {
    reservedThisDraw: params.reservedThisDraw,
    settled: params.settled,
  };

  const repayIx = buildRepayInstruction({
    creditVaultProgramId:
      params.creditVaultProgramId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID),
    signer: params.repaySigner,
    pool: params.pool,
    line: params.line,
    repay,
  });

  return {
    settleAndSeal,
    distribute,
    repay: repayIx,
    settled: params.settled,
  };
}

/** Derive payee ATA for distribute preflight. */
export function payeeTokenAccount(
  mint: PublicKey,
  payee: PublicKey,
  tokenProgram?: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(
    mint,
    payee,
    true,
    tokenProgram ?? defaultTokenProgram(),
  );
}
