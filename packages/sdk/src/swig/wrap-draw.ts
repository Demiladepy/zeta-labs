/**
 * Spec for wrapping credit-vault `draw` inside a Swig execute transaction.
 * Implementation blocked until M1 (program id + SDK) — see docs/SWIG.md.
 */
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { CREDIT_VAULT_PROGRAM_ID } from "../types.js";

const CREDIT_VAULT_ID = new PublicKey(CREDIT_VAULT_PROGRAM_ID);
import { SwigNotConfiguredError } from "./index.js";

export type SwigWrappedDrawSpec = {
  /** Swig smart-wallet PDA — must be `CreditLine.agent` and draw account #0 signer. */
  swigWallet: PublicKey;
  /** Inner vault instruction (from seven-step plan `draw_open_channel`). */
  drawInstruction: TransactionInstruction;
  /** Programs Swig must allow for this delegate role. */
  allowedProgramIds: PublicKey[];
};

export function buildSwigWrappedDrawSpec(
  swigWallet: PublicKey,
  drawInstruction: TransactionInstruction,
): SwigWrappedDrawSpec {
  if (!drawInstruction.programId.equals(CREDIT_VAULT_ID)) {
    throw new Error("wrap-draw expects credit-vault draw instruction");
  }
  const agentMeta = drawInstruction.keys[0];
  if (!agentMeta?.pubkey.equals(swigWallet)) {
    throw new Error("draw instruction agent meta must be the Swig wallet pubkey");
  }
  return {
    swigWallet,
    drawInstruction,
    allowedProgramIds: [CREDIT_VAULT_ID],
  };
}

/** Build the outer Swig execute tx — stub until SDK is pinned. */
export function buildSwigExecuteDrawTransaction(_spec: SwigWrappedDrawSpec): never {
  throw new SwigNotConfiguredError();
}
