/**
 * Swig delegated authority for line→agent grants (Phase 2).
 * Implementation lands after program id + SDK are pinned in docs/SWIG.md.
 */
import { PublicKey, type Connection, type Keypair } from "@solana/web3.js";

export type SwigLineGrantPlan = {
  lender: PublicKey;
  swigWallet: PublicKey;
  delegate: PublicKey;
  /** Human-readable steps for devnet demo / STATUS evidence. */
  steps: string[];
};

export class SwigNotConfiguredError extends Error {
  constructor() {
    super(
      "Swig program id and SDK are not pinned yet. See docs/PHASE2-ANURAG.md (M1 spike).",
    );
    this.name = "SwigNotConfiguredError";
  }
}

/** Plan onboarding a Swig wallet as `open_line` agent (no txs yet). */
export function planSwigLineGrant(lender: PublicKey, delegate: PublicKey): SwigLineGrantPlan {
  return {
    lender,
    swigWallet: PublicKey.default, // replaced once wallet is created on-chain
    delegate,
    steps: [
      "Create Swig wallet owned by lender",
      "Grant delegate permission: credit-vault `draw` only (amount bounded by policy)",
      "open_line(pool, agent=swigWallet, …)",
      "draw via Swig execute (delegate signs, wallet PDA is agent signer)",
      "Seven-step spend: meter + operator settle unchanged",
    ],
  };
}

export async function assertSwigReady(_connection: Connection): Promise<void> {
  throw new SwigNotConfiguredError();
}

export type CreateSwigWalletParams = {
  connection: Connection;
  lender: Keypair;
  delegate: Keypair;
};

/** On-chain Swig wallet creation — stub until M1. */
export async function createSwigWalletForLineGrant(
  _params: CreateSwigWalletParams,
): Promise<PublicKey> {
  throw new SwigNotConfiguredError();
}
