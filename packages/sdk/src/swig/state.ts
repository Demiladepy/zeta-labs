import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PublicKey } from "@solana/web3.js";

export type SwigLineGrantState = {
  swigId: number[];
  swigAccount: string;
  swigWallet: string;
  rootRoleId: number;
  delegateRoleId: number;
  lender: string;
  delegate: string;
  createdAt: string;
  /** Set after devnet:swig-line-open */
  creditLine?: string;
  policy?: string;
  pool?: string;
  /** Set after devnet:swig-revoke-delegate */
  delegateRevokedAt?: string;
  removeDelegateSignature?: string;
};

const STATE_PATH = resolve(import.meta.dirname, "../../../../.keys/swig-line-grant.json");

export function swigGrantStatePath(): string {
  return STATE_PATH;
}

export function loadSwigLineGrantState(): SwigLineGrantState | null {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readFileSync(STATE_PATH, "utf8")) as SwigLineGrantState;
}

export function saveSwigLineGrantState(state: SwigLineGrantState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function swigWalletFromState(state: SwigLineGrantState): PublicKey {
  return new PublicKey(state.swigWallet);
}

export function swigAccountFromState(state: SwigLineGrantState): PublicKey {
  return new PublicKey(state.swigAccount);
}
