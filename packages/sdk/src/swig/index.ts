import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PublicKey as PK } from "@solana/web3.js";
import { SWIG_PROGRAM_ID } from "./config.js";
import { loadSwigLineGrantState } from "./state.js";
import { fetchSwigForState, setupSwigLineGrant, type SetupSwigLineGrantResult } from "./wallet.js";

export type SwigLineGrantPlan = {
  lender: PublicKey;
  swigWallet: PublicKey;
  delegate: PublicKey;
  steps: string[];
};

export class SwigNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message ?? "Swig line grant not configured. Run npm run devnet:swig-setup -- --submit");
    this.name = "SwigNotConfiguredError";
  }
}

export function planSwigLineGrant(lender: PublicKey, delegate: PublicKey): SwigLineGrantPlan {
  const state = loadSwigLineGrantState();
  return {
    lender,
    swigWallet: state ? new PK(state.swigWallet) : PK.default,
    delegate,
    steps: [
      "Create Swig wallet owned by lender",
      "Grant delegate permission: credit-vault + payment-channels",
      "open_line(pool, agent=swigWallet, …)",
      "draw via Swig Sign (delegate signs, wallet is agent)",
      "Seven-step spend: meter + operator settle unchanged",
    ],
  };
}

export async function assertSwigReady(connection: Connection): Promise<void> {
  try {
    const info = await connection.getAccountInfo(SWIG_PROGRAM_ID);
    if (!info?.executable) {
      throw new SwigNotConfiguredError(
        `Swig program not deployed on this RPC: ${SWIG_PROGRAM_ID.toBase58()}`,
      );
    }
  } catch (error) {
    if (error instanceof SwigNotConfiguredError) throw error;
    console.warn(
      "Swig program probe skipped (RPC slow). Known devnet id:",
      SWIG_PROGRAM_ID.toBase58(),
    );
  }
}

export type CreateSwigWalletParams = {
  connection: Connection;
  lender: Keypair;
  delegate: Keypair;
};

export async function createSwigWalletForLineGrant(
  params: CreateSwigWalletParams,
): Promise<SetupSwigLineGrantResult> {
  return setupSwigLineGrant(params);
}

export { SWIG_PROGRAM_ID } from "./config.js";
export {
  loadSwigLineGrantState,
  saveSwigLineGrantState,
  swigGrantStatePath,
  type SwigLineGrantState,
} from "./state.js";
export {
  fetchSwigForState,
  setupSwigLineGrant,
  swigSignInstructions,
  type SetupSwigLineGrantResult,
} from "./wallet.js";
