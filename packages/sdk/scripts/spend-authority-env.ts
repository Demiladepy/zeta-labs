/** Load Phase 2 spend authority from scripts/devnet.env + local key files. */
import { existsSync } from "node:fs";
import { PublicKey, type Keypair } from "@solana/web3.js";
import {
  type SpendAuthority,
  spendAuthorityFromAgentKeypair,
  type SwigDelegateSpendAuthority,
} from "../src/spend-authority.js";
import type { DevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

export function loadSwigDelegateFromEnv(): SwigDelegateSpendAuthority | null {
  const wallet = process.env.SWIG_WALLET_PUBKEY?.trim();
  const delegatePath = process.env.SWIG_DELEGATE_KEYPAIR_PATH?.trim();
  if (!wallet && !delegatePath) return null;
  if (!wallet || !delegatePath) {
    throw new Error(
      "Set both SWIG_WALLET_PUBKEY and SWIG_DELEGATE_KEYPAIR_PATH, or neither (see docs/SWIG.md).",
    );
  }
  if (!existsSync(delegatePath)) {
    throw new Error(`SWIG_DELEGATE_KEYPAIR_PATH file not found: ${delegatePath}`);
  }
  return {
    kind: "swig-delegate",
    swigWallet: new PublicKey(wallet),
    delegate: loadKeypair(delegatePath),
  };
}

/** Hot signing key for draw / x402 (delegate when Swig is configured). */
export function resolveSpendAuthority(env: DevnetEnv, spendAgent: Keypair): SpendAuthority {
  const swig = loadSwigDelegateFromEnv();
  if (swig) return swig;
  void env;
  return spendAuthorityFromAgentKeypair(spendAgent);
}
