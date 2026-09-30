/**
 * Live x402 smoke: pay a real pay-kit playground `upto` endpoint.
 *
 * Setup:
 *   1. scripts/start-paykit-playground.ps1  (NETWORK=devnet, port 3000)
 *   2. npm run x402:smoke
 */

import { readFileSync } from "node:fs";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { fetchPaidEndpoint } from "../src/paykit/x402.js";
import { DEFAULT_X402_ENDPOINT } from "../src/x402-merchant.js";
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

async function payEndpoint(
  endpoint: string,
  rpcUrl: string,
  network: "devnet" | "localnet" | "mainnet",
  signer: Awaited<ReturnType<typeof loadSigner>>,
): Promise<{ status: number; body: string }> {
  const isPost = endpoint.includes("summarize");
  if (isPost) {
    const payKitClient = await import("@solana/pay-kit/client");
    const client = await payKitClient.PayKitClient.builder()
      .signer(signer)
      .rpcUrl(rpcUrl)
      .network(network)
      .permissions(false)
      .build();
    const response = await client.fetch(
      endpoint,
      { method: "POST", body: "Zeta Phase 3 x402 smoke.", headers: { "Content-Type": "text/plain" } },
      "x402",
    );
    return { status: response.status, body: await response.text() };
  }
  const result = await fetchPaidEndpoint({
    endpoint,
    rpcUrl,
    network,
    signer,
    protocol: "x402",
  });
  return { status: result.status, body: result.body };
}

async function main() {
  const env = loadDevnetEnv();
  const endpoint = env.x402Endpoint ?? DEFAULT_X402_ENDPOINT;

  const signer = await loadSigner(env.agentKeypairPath);
  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);
  const pubkey = new PublicKey(signer.address);
  const balance = await connection.getBalance(pubkey);

  console.log("=== x402 smoke (Phase 3) ===");
  console.log("agent:", signer.address);
  console.log("network:", env.network);
  console.log("balance:", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("endpoint:", endpoint);

  const health = await fetch(endpoint.replace(/\/api\/v1\/.*$/, "/api/v1/health")).catch(() => null);
  if (!health?.ok) {
    console.error("\nPlayground API not reachable. Run scripts/start-paykit-playground.ps1");
    process.exit(1);
  }

  if (env.network === "localnet" && env.playgroundFaucetUrl) {
    await fundViaPlaygroundFaucet(env.playgroundFaucetUrl, signer.address);
  } else if (env.playgroundFaucetUrl) {
    console.log("skip: playground faucet is localnet-only (agent must hold devnet USDC)");
  }

  const { status, body } = await payEndpoint(endpoint, rpcUrl, env.network, signer);

  console.log("\nstatus:", status);
  console.log("body:", body.slice(0, 500));
  if (status >= 200 && status < 300) {
    console.log("\nOK — x402 payment succeeded.");
    return;
  }

  console.error("\nPayment/request failed (agent wallet needs devnet USDC).");
  console.error("Fund: https://faucet.circle.com/ →", signer.address);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
