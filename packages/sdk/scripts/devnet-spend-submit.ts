/**
 * Build or submit the full seven-step spend path on devnet.
 *
 *   npm run devnet:spend-plan --prefix packages/sdk     # dry-run (plan only)
 *   npm run devnet:spend-submit --prefix packages/sdk   # dry-run (default)
 *   npm run devnet:spend-submit -- --submit             # send txs (after deploy)
 *   npm run devnet:spend-submit -- --submit --skip-x402
 */

import { Connection } from "@solana/web3.js";
import { submitSevenStepSpend } from "../src/spend-submit.js";
import { buildDemoSpendParams } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function flagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const skipX402 = hasFlag("--skip-x402");
  const settledRaw = flagValue("--settled");
  const network = env.network ?? "devnet";
  const cluster = network === "mainnet" ? "mainnet-beta" : network === "localnet" ? "devnet" : "devnet";

  const { lender, agent, operator, planParams } = buildDemoSpendParams(env);
  const connection = new Connection(env.rpcUrl, "confirmed");

  if (settledRaw) {
    planParams.settledEstimate = BigInt(settledRaw);
  }

  console.log("=== Zeta devnet spend submit ===");
  console.log("mode:", submit ? "SUBMIT" : "dry-run");
  console.log("rpc:", env.rpcUrl);
  console.log("network:", network);
  console.log("lender:", lender.publicKey.toBase58());
  console.log("operator:", operator.publicKey.toBase58());
  if (!env.operatorKeypairPath) {
    console.warn("warn: OPERATOR_KEYPAIR_PATH unset — generated ephemeral operator for planning only");
  }
  console.log("");

  const openSlot = submit
    ? BigInt(await connection.getSlot("confirmed"))
    : 300_000_000n;

  const result = await submitSevenStepSpend({
    connection,
    lender,
    agent,
    operator,
    planParams: { ...planParams, openSlot },
    submit,
    skipX402,
    network,
    cluster,
  });

  if (result.dryRun) {
    console.log("OK — dry run complete. Re-run with --submit after devnet:preflight passes.");
    return;
  }

  console.log("");
  console.log("=== Submitted ===");
  for (const step of result.steps) {
    if (step.skipped) {
      console.log(`  ${step.name}: skipped`);
    } else if (step.explorerUrl) {
      console.log(`  ${step.name}: ${step.explorerUrl}`);
    } else if (step.name === "x402_upto") {
      console.log(`  ${step.name}: ok`);
    }
  }
  console.log("");
  console.log("OK — seven-step submit finished.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
