/**
 * Live x402 smoke: pay a real endpoint via local pay-kit playground.
 *
 * Setup:
 *   1. copy scripts\devnet.env.example scripts\devnet.env
 *   2. Start playground API on port 3000
 *   3. npm run x402:smoke --prefix packages/sdk
 */

import { readFileSync } from "node:fs";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { fetchPaidEndpoint } from "../src/paykit/x402.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function loadSigner(keypairPath: string) {
  const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
  return createKeyPairSignerFromBytes(Uint8Array.from(secret));
}

async function fundViaPlaygroundFaucet(
  faucetUrl: string,
  address: string,
): Promise<void> {
  const res = await fetch(faucetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Faucet failed (${res.status}): ${body}`);
  }
  console.log("faucet: funded sandbox USDC + SOL for", address);
}

async function main() {
  const env = loadDevnetEnv();
  if (!env.x402Endpoint) {
    throw new Error("Set X402_ENDPOINT in scripts/devnet.env");
  }

  const signer = await loadSigner(env.agentKeypairPath);
  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);
  const pubkey = new PublicKey(signer.address);
  const balance = await connection.getBalance(pubkey);

  console.log("=== x402 smoke ===");
  console.log("agent:", signer.address);
  console.log("network:", env.network);
  console.log("rpc:", env.rpcUrl);
  console.log("balance:", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("endpoint:", env.x402Endpoint);

  if (env.playgroundFaucetUrl) {
    await fundViaPlaygroundFaucet(env.playgroundFaucetUrl, signer.address);
  }

  const result = await fetchPaidEndpoint({
    endpoint: env.x402Endpoint,
    rpcUrl: env.rpcUrl,
    network: env.network,
    signer,
    protocol: "x402",
  });

  console.log("\nstatus:", result.status);
  console.log("body:", result.body.slice(0, 500));
  if (result.status >= 200 && result.status < 300) {
    console.log("\nOK — x402 payment succeeded.");
    return;
  }

  if (result.status === 404) {
    console.error("\nEndpoint 404 — is playground running on port 3000?");
    console.error("  cd C:\\Projects\\pay-kit\\typescript\\examples\\playground-api");
    console.error("  $env:PORT=3000; pnpm start");
  } else {
    console.error("\nPayment/request failed.");
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
