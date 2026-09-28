import { Connection, PublicKey } from "@solana/web3.js";
import { decodeLine } from "@zeta/sdk/dashboard";
import type { DashboardConfig } from "./data.js";

const SWIG_LINE = "9nc1MRMEoxKs9GQvTtk72xDa4zqzpCX9qTknBj1RdjpF";
const SWIG_POOL = "4tPUrLPZpsBv2J6YnkdAthQGbXNG7moiNCHVCKFKcz2j";

/** Anurag devnet Swig line — see docs/PROOF.md (2026-09-28). */
export async function loadSwigDevnetPreset(rpcUrl: string): Promise<DashboardConfig> {
  const connection = new Connection(rpcUrl, "confirmed");
  const lineInfo = await connection.getAccountInfo(new PublicKey(SWIG_LINE));
  if (!lineInfo) throw new Error("Swig proof credit line not found on this RPC");
  const policy = new PublicKey(decodeLine(lineInfo.data).policy).toBase58();
  return {
    rpcUrl,
    poolAddress: SWIG_POOL,
    lineAddress: SWIG_LINE,
    policyAddress: policy,
  };
}
