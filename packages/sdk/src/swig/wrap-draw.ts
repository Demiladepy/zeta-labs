/**
 * Wrap credit-vault instructions in Swig Sign for a delegate role.
 */
import type { Swig } from "@swig-wallet/classic";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { CREDIT_VAULT_PROGRAM_ID } from "../types.js";
import { swigSignInstructions } from "./wallet.js";

const CREDIT_VAULT_ID = new PublicKey(CREDIT_VAULT_PROGRAM_ID);

export type SwigWrappedDrawSpec = {
  swigWallet: PublicKey;
  drawInstruction: TransactionInstruction;
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

export async function buildSwigExecuteInstructions(
  swig: Swig,
  delegateRoleId: number,
  spec: SwigWrappedDrawSpec,
): Promise<TransactionInstruction[]> {
  return swigSignInstructions(swig, delegateRoleId, [spec.drawInstruction]);
}

/** @deprecated use buildSwigExecuteInstructions */
export function buildSwigExecuteDrawTransaction(
  _spec: SwigWrappedDrawSpec,
): never {
  throw new Error("use buildSwigExecuteInstructions with a fetched Swig account");
}
