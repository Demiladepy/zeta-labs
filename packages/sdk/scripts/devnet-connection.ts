/**
 * Devnet RPC with timeout + fallbacks. Re-exports HTTP helpers from src.
 */
import { Connection, type ConnectionConfig } from "@solana/web3.js";
import { createHttpConnection, sendTransactionHttp } from "../src/devnet-rpc.js";

export { sendTransactionHttp } from "../src/devnet-rpc.js";

/** Tatum free tier is 5 req/min — do not use for submit scripts. */
export const DEVNET_RPC_FALLBACKS = ["https://api.devnet.solana.com"] as const;

async function probeRpc(url: string, attempts = 3): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const connection = createDevnetConnection(url);
      await connection.getVersion();
      return true;
    } catch {
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  return false;
}

export function createDevnetConnection(
  rpcUrl: string,
  commitment: ConnectionConfig["commitment"] = "confirmed",
): Connection {
  return createHttpConnection(rpcUrl, commitment);
}

function candidateRpcUrls(primary: string): string[] {
  const trimmed = primary.trim();
  const out: string[] = [];
  const seen = new Set<string>();
  const heliusKey = process.env.HELIUS_API_KEY?.trim();
  if (heliusKey) {
    const helius = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
    if (!seen.has(helius)) {
      seen.add(helius);
      out.push(helius);
    }
  }
  const ordered =
    trimmed.includes("tatum.io")
      ? [...DEVNET_RPC_FALLBACKS, trimmed]
      : [trimmed, ...DEVNET_RPC_FALLBACKS];
  for (const url of ordered) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export async function createResilientDevnetConnection(
  rpcUrl: string,
  commitment: ConnectionConfig["commitment"] = "confirmed",
): Promise<{ connection: Connection; rpcUrl: string }> {
  const candidates = candidateRpcUrls(rpcUrl);
  let lastError: unknown;
  for (const url of candidates) {
    if (!(await probeRpc(url))) {
      lastError = new Error(`probe failed for ${url}`);
      continue;
    }
    const connection = createDevnetConnection(url, commitment);
    if (url !== candidates[0]) {
      console.warn(`RPC: using ${url}`);
    }
    if (url.includes("tatum.io")) {
      console.warn(
        "warn: Tatum free RPC is rate-limited — set RPC_URL=https://api.devnet.solana.com or HELIUS_API_KEY",
      );
    }
    return { connection, rpcUrl: url };
  }
  throw new Error(
    `No devnet RPC reachable. Tried:\n  - ${candidates.join("\n  - ")}\n` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}\n` +
      "Set RPC_URL=https://api.devnet.solana.com or HELIUS_API_KEY in scripts/devnet.env",
  );
}
