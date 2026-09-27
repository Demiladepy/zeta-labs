/**
 * Load scripts/devnet.env into process.env. File is gitignored.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type DevnetEnv = {
  rpcUrl: string;
  network: "devnet" | "localnet" | "mainnet";
  agentKeypairPath: string;
  operatorKeypairPath?: string;
  x402Endpoint?: string;
  playgroundFaucetUrl?: string;
};

export type DevnetPreflightEnv = Omit<DevnetEnv, "agentKeypairPath"> & {
  agentKeypairPath?: string;
};

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

export function loadDevnetEnv(): DevnetEnv;
export function loadDevnetEnv(options: { requireAgent: false }): DevnetPreflightEnv;
export function loadDevnetEnv(
  options: { requireAgent?: boolean } = {},
): DevnetEnv | DevnetPreflightEnv {
  const envPath = resolve(import.meta.dirname, "../../../scripts/devnet.env");
  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}\n` +
        "Copy scripts/devnet.env.example → scripts/devnet.env" +
        ((options.requireAgent ?? true) ? " and set AGENT_KEYPAIR_PATH." : "."),
    );
  }

  const file = parseEnvFile(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(file)) {
    if (!process.env[key]) process.env[key] = value;
  }

  const heliusKey = process.env.HELIUS_API_KEY?.trim();
  let rpcUrl =
    process.env.RPC_URL?.trim() ||
    (heliusKey ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}` : undefined);
  if (rpcUrl?.includes("tatum.io")) {
    console.warn(
      "scripts/devnet.env: Tatum free RPC is 5 req/min — switching to https://api.devnet.solana.com",
    );
    rpcUrl = "https://api.devnet.solana.com";
  }
  const agentKeypairPath = process.env.AGENT_KEYPAIR_PATH;
  if (!rpcUrl) throw new Error("RPC_URL missing in scripts/devnet.env");
  if ((options.requireAgent ?? true) && !agentKeypairPath) {
    throw new Error("AGENT_KEYPAIR_PATH missing in scripts/devnet.env");
  }

  const network = (process.env.NETWORK ?? "devnet") as DevnetEnv["network"];

  return {
    rpcUrl,
    network,
    ...(agentKeypairPath ? { agentKeypairPath } : {}),
    operatorKeypairPath: process.env.OPERATOR_KEYPAIR_PATH,
    x402Endpoint: process.env.X402_ENDPOINT,
    playgroundFaucetUrl: process.env.PLAYGROUND_FAUCET_URL,
  };
}
