/**
 * Phase 3 readiness (live x402 against pay-kit playground on devnet).
 *
 *   npm run devnet:phase3-preflight
 */
import { existsSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { DEFAULT_X402_ENDPOINT, x402DrawAmountBaseUnits } from "../src/x402-merchant.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

async function checkPlayground(endpoint: string): Promise<{ ok: boolean; detail: string }> {
  const base = endpoint.replace(/\/api\/v1\/.*$/, "");
  try {
    const res = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, detail: `health HTTP ${res.status}` };
    const body = (await res.json()) as { ok?: boolean; network?: string };
    return {
      ok: body.ok === true,
      detail: `health ok network=${body.network ?? "?"}`,
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const env = loadDevnetEnv();
  const endpoint = env.x402Endpoint ?? DEFAULT_X402_ENDPOINT;
  const draw = x402DrawAmountBaseUnits(endpoint, false);

  console.log("=== Zeta Phase 3 preflight (Anurag — live x402) ===\n");
  console.log("RPC:", env.rpcUrl);
  console.log("NETWORK:", env.network);
  console.log("X402_ENDPOINT:", endpoint);
  console.log("draw / channel deposit (base units):", draw.toString());

  const lender = loadKeypair(env.agentKeypairPath);
  console.log("\nAgent/lender:", lender.publicKey.toBase58());

  if (env.operatorKeypairPath) {
    if (!existsSync(env.operatorKeypairPath)) {
      console.error("\nMissing operator file:", env.operatorKeypairPath);
      process.exit(1);
    }
    console.log("Operator:", loadKeypair(env.operatorKeypairPath).publicKey.toBase58());
  } else {
    console.warn("\nWARN: OPERATOR_KEYPAIR_PATH unset — submit will fail at settle.");
  }

  const playground = await checkPlayground(endpoint);
  if (playground.ok) {
    console.log("\nPlayground API:", playground.detail);
  } else {
    console.error("\nPlayground API not ready:", playground.detail);
    console.error("Start: .\\scripts\\start-paykit-playground.ps1  (from repo root)");
    process.exit(1);
  }

  if (env.network === "devnet") {
    console.log(
      "\nDevnet: agent wallet must hold devnet USDC (playground faucet is localnet-only).",
    );
    const connection = new Connection(env.rpcUrl, "confirmed");
    const sol = await connection.getBalance(lender.publicKey);
    console.log("SOL balance:", sol / 1e9);
  }

  console.log("\n--- Verify Phase 3 ---");
  console.log(" npm run x402:smoke");
  console.log(" npm run devnet:spend-submit -- --submit          # full seven-step + x402");
  console.log(" npm run devnet:agent-spend -- --submit         # existing line + x402");
  console.log("\nRegression (on-chain only):");
  console.log(" npm run devnet:spend-submit -- --submit --skip-x402");
  console.log("\nDocs: docs/PHASE3-ANURAG.md  docs/X402.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
