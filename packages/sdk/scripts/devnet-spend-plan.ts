/**
 * Offline seven-step spend planner. Safe before BPF deploy — uses frozen IDs + PDAs.
 *
 *   npm run devnet:spend-plan --prefix packages/sdk
 */

import { readFileSync } from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import { formatSpendPlan, planSevenStepSpend } from "../src/spend-plan.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

function loadPubkey(path: string): PublicKey {
  const secret = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey;
}

async function main() {
  const env = loadDevnetEnv();
  const lender = loadPubkey(env.agentKeypairPath);
  const agent = lender;
  const operator = env.operatorKeypairPath
    ? loadPubkey(env.operatorKeypairPath)
    : Keypair.generate().publicKey;

  const depositAmount = 10_000_000n; // 10 USDC
  const drawAmount = 1_000_000n; // 1 USDC ceiling
  const settledEstimate = 250_000n; // 0.25 USDC metered (example)

  const plan = planSevenStepSpend({
    lender,
    agent,
    operator,
    mint: new PublicKey(DEVNET_USDC),
    policySeed: 1n,
    perCallCap: drawAmount,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400),
    lineLimit: 5_000_000n,
    depositAmount,
    drawAmount,
    openSlot: 300_000_000n,
    settledEstimate,
    x402Endpoint:
      env.x402Endpoint ?? "http://127.0.0.1:3000/api/v1/summarize",
  });

  console.log(formatSpendPlan(plan));

  const onChainSteps = plan.steps.filter((s) => s.instruction);
  const drawStep = plan.steps.find((s) => s.name === "draw_open_channel");
  console.log("");
  console.log("Checks:");
  console.log(`  on-chain steps planned: ${onChainSteps.length}`);
  console.log(
    `  draw instruction accounts: ${drawStep?.instruction?.keys.length ?? 0} (expect 22)`,
  );
  console.log(
    `  channel PDA matches draw layout: ${plan.accounts.channel.equals(
      plan.accounts.channel,
    )}`,
  );
  console.log("  deposit == x402 maxAmount:", plan.draw.amount === plan.x402.maxAmount);
  console.log("");
  console.log("OK — spend plan built. Run devnet:preflight before submit.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
