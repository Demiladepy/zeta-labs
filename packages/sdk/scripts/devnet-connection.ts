/**
 * Devnet RPC with timeout + fallbacks (official endpoint often hangs on some networks).
 */
import { Connection, type ConnectionConfig } from "@solana/web3.js";

export const DEVNET_RPC_FALLBACKS = [
  "https://solana-devnet.gateway.tatum.io",
  "https://api.devnet.solana.com",
] as const;

const RPC_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createDevnetConnection(
  rpcUrl: string,
  commitment: ConnectionConfig["commitment"] = "confirmed",
): Connection {
  return new Connection(rpcUrl, {
    commitment,
    fetch: fetchWithTimeout,
  });
}

function candidateRpcUrls(primary: string): string[] {
  const trimmed = primary.trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const url of [trimmed, ...DEVNET_RPC_FALLBACKS]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Pick the first RPC that answers getVersion (logs when falling back). */
export async function createResilientDevnetConnection(
  rpcUrl: string,
  commitment: ConnectionConfig["commitment"] = "confirmed",
): Promise<{ connection: Connection; rpcUrl: string }> {
  const candidates = candidateRpcUrls(rpcUrl);
  let lastError: unknown;
  for (const url of candidates) {
    const connection = createDevnetConnection(url, commitment);
    try {
      await connection.getVersion();
      if (url !== candidates[0]) {
        console.warn(`RPC fallback: using ${url} (${candidates[0]} unreachable)`);
      }
      return { connection, rpcUrl: url };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `No devnet RPC reachable. Tried:\n  - ${candidates.join("\n  - ")}\n` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}\n` +
      "Set RPC_URL in scripts/devnet.env (Helius/QuickNode key URL also works).",
  );
}
