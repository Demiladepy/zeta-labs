/**
 * Delegate draw + settle path on a Swig-backed line (lender not in spend txs).
 *
 *   npm run devnet:swig-spend -- --submit --skip-x402
 */
import { PublicKey } from "@solana/web3.js";
import { submitAgentSpend } from "../src/spend-submit.js";
import { findLinePda, findPoolPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadSwigLineGrantState, swigWalletFromState } from "../src/swig/state.js";
import { SwigNotConfiguredError } from "../src/swig/index.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import { loadOrCreateSpendAgent } from "./resolve-spend-context.js";
import { resolveSpendAuthority } from "./spend-authority-env.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const MAX_RETRIES = 3;

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const skipX402 = hasFlag("--skip-x402");
  const grant = loadSwigLineGrantState();
  if (!grant) throw new SwigNotConfiguredError();

  const lender = loadKeypair(env.agentKeypairPath);
  const delegate = loadOrCreateSpendAgent(lender);
  const operator = env.operatorKeypairPath
    ? loadKeypair(env.operatorKeypairPath)
    : (() => {
        throw new Error("OPERATOR_KEYPAIR_PATH required");
      })();

  const mint = new PublicKey(DEVNET_USDC);
  const pool = findPoolPda(lender.publicKey, mint);
  const swigWallet = swigWalletFromState(grant);
  const line = findLinePda(pool, swigWallet);
  const authority = resolveSpendAuthority(env, delegate);

  console.log("=== Swig delegate spend ===");
  console.log("mode:", submit ? "SUBMIT" : "dry-run");
  console.log("line:", line.toBase58());
  console.log("swig wallet:", swigWallet.toBase58());
  console.log("delegate:", delegate.publicKey.toBase58());
  console.log("lender (not in spend txs):", lender.publicKey.toBase58());

  if (!submit) return;

  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);

  // Ensure swigWallet has sufficient lamports for channel account creation
  const swigBalance = await connection.getBalance(swigWallet, "confirmed");
  if (swigBalance < 20_000_000) {
    console.log("swigWallet balance low, topping up from lender...");
    const { sendTransactionHttp } = await import("../src/devnet-rpc.js");
    const { SystemProgram } = await import("@solana/web3.js");
    await sendTransactionHttp(connection, lender, [
      SystemProgram.transfer({
        fromPubkey: lender.publicKey,
        toPubkey: swigWallet,
        lamports: 50_000_000,
      }),
    ]);
  }

  // Retry the entire spend flow on transient devnet failures (blockhash expiry)
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await submitAgentSpend({
        connection,
        agent: delegate,
        authority,
        operator,
        line,
        amount: DEMO_AMOUNTS.draw,
        endpoint: env.x402Endpoint ?? "",
        settledEstimate: DEMO_AMOUNTS.settledEstimate,
        skipX402,
        network: "devnet",
        cluster: "devnet",
      });

      for (const step of result.steps) {
        if (step.explorerUrl) console.log(`  ${step.name}: ${step.explorerUrl}`);
      }
      console.log("OK — Swig delegate spend finished.");
      return;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient =
        msg.includes("expired") ||
        msg.includes("block height") ||
        msg.includes("429") ||
        msg.includes("timeout");
      if (isTransient && attempt < MAX_RETRIES) {
        console.warn(`\nSpend attempt ${attempt} failed (${msg.slice(0, 80)})`);
        console.warn(`Retrying (${attempt + 1}/${MAX_RETRIES}) in 5s...\n`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
    }
  }
  throw lastError;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
