/**
 * Who may sign vault `draw` for a credit line.
 * Phase 1: raw agent keypair. Phase 2: Swig delegate (see `swig/`).
 */
import type { Keypair, PublicKey } from "@solana/web3.js";

/** Pubkey stored on `CreditLine.agent` (raw key or Swig wallet). */
export type LineAgentPubkey = PublicKey;

export type RawKeySpendAuthority = {
  kind: "raw-keypair";
  /** Same key as `line.agent` on-chain. */
  agent: Keypair;
};

export type SwigDelegateSpendAuthority = {
  kind: "swig-delegate";
  /** Swig smart-wallet pubkey — must match `line.agent`. */
  swigWallet: PublicKey;
  /** Hot key authorized in Swig to invoke credit-vault `draw`. */
  delegate: Keypair;
};

export type SpendAuthority = RawKeySpendAuthority | SwigDelegateSpendAuthority;

export function lineAgentPubkey(auth: SpendAuthority): LineAgentPubkey {
  return auth.kind === "raw-keypair" ? auth.agent.publicKey : auth.swigWallet;
}

export function drawSignerKeypair(auth: SpendAuthority): Keypair {
  return auth.kind === "raw-keypair" ? auth.agent : auth.delegate;
}

export function spendAuthorityFromAgentKeypair(agent: Keypair): SpendAuthority {
  return { kind: "raw-keypair", agent };
}

/** Ensure on-chain `CreditLine.agent` matches this authority. */
export function assertAuthorityOwnsLine(lineAgent: PublicKey, authority: SpendAuthority): void {
  const expected = lineAgentPubkey(authority);
  if (!lineAgent.equals(expected)) {
    const mode = authority.kind === "swig-delegate" ? "Swig wallet" : "agent key";
    throw new Error(
      `line.agent ${lineAgent.toBase58()} does not match ${mode} ${expected.toBase58()}`,
    );
  }
}
