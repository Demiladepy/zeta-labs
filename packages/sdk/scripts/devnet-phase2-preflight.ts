/**
 * Phase 2 readiness check (Swig lane). Does not send transactions.
 *
 *   npm run devnet:phase2-preflight
 */
import { existsSync } from "node:fs";
import { Connection } from "@solana/web3.js";
import { planSwigLineGrant, SwigNotConfiguredError } from "../src/swig/index.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

async function main() {
  const env = loadDevnetEnv();
  const connection = new Connection(env.rpcUrl, "confirmed");

  console.log("=== Zeta Phase 2 preflight (Anurag) ===\n");
  console.log("RPC:", env.rpcUrl);
  console.log("NETWORK:", env.network);

  const lender = loadKeypair(env.agentKeypairPath);
  console.log("\nLender (AGENT_KEYPAIR_PATH):", lender.publicKey.toBase58());

  if (env.operatorKeypairPath) {
    if (!existsSync(env.operatorKeypairPath)) {
      console.error("\nMissing operator file:", env.operatorKeypairPath);
      process.exit(1);
    }
    const operator = loadKeypair(env.operatorKeypairPath);
    console.log("Operator:", operator.publicKey.toBase58());
  } else {
    console.warn("\nWARN: OPERATOR_KEYPAIR_PATH unset — live settle will use ephemeral operator.");
  }

  const swigWallet = process.env.SWIG_WALLET_PUBKEY?.trim();
  const delegatePath = process.env.SWIG_DELEGATE_KEYPAIR_PATH?.trim();
  if (swigWallet) {
    console.log("\nSWIG_WALLET_PUBKEY:", swigWallet);
  }
  if (delegatePath) {
    if (!existsSync(delegatePath)) {
      console.error("\nMissing SWIG_DELEGATE_KEYPAIR_PATH file:", delegatePath);
      process.exit(1);
    }
    console.log("Swig delegate:", loadKeypair(delegatePath).publicKey.toBase58());
  }

  const delegateForPlan = delegatePath
    ? loadKeypair(delegatePath).publicKey
    : lender.publicKey;
  const plan = planSwigLineGrant(lender.publicKey, delegateForPlan);
  console.log("\n--- Swig line-grant plan (target) ---");
  for (const step of plan.steps) {
    console.log(" •", step);
  }

  try {
    await assertSwigSdk(connection);
  } catch (e) {
    if (e instanceof SwigNotConfiguredError) {
      console.log("\nSwig integration:", e.message);
    } else {
      throw e;
    }
  }

  console.log("\n--- Phase 2 progress (Anurag lane) ---");
  const done = [
    "Spend authority model + tests",
    "Delegated agent spend script (lender not in spend txs)",
    "Swig wrap-draw spec (execute tx stub)",
    "docs/SWIG.md contributor blockers",
    "Zcash dropped",
  ];
  const blocked = [
    "M1: Swig program id + SDK pin",
    "M2–M4: on-chain Swig wallet + delegate draw/revoke",
    "M5: STATUS.md + PROOF.md explorer evidence",
  ];
  console.log("Done in repo:");
  for (const item of done) console.log("  [x]", item);
  console.log("Blocked on contributors:");
  for (const item of blocked) console.log("  [ ]", item);

  console.log("\n--- How to verify (no Swig required) ---");
  console.log(" npm test");
  console.log(" npm run devnet:agent-spend            # dry-run");
  console.log(" npm run devnet:agent-spend -- --submit --skip-x402   # needs RPC + existing line");

  console.log("\n--- Phase 1 regression ---");
  console.log(" npm run devnet:preflight");
  console.log(" npm run devnet:spend-submit -- --submit --skip-x402");
  console.log("\nDocs: docs/PHASE2-ANURAG.md  docs/SWIG.md");
}

async function assertSwigSdk(connection: Connection): Promise<void> {
  const { assertSwigReady } = await import("../src/swig/index.js");
  await assertSwigReady(connection);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
