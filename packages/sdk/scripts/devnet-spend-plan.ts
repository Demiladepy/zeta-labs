/**
 * Offline seven-step spend planner. Safe before BPF deploy — uses frozen IDs + PDAs.
 *
 *   npm run devnet:spend-plan --prefix packages/sdk
 */

import { formatSpendPlan, planSevenStepSpend } from "../src/spend-plan.js";
import { buildDemoSpendParams } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv();
  const { planParams } = buildDemoSpendParams(env);

  const plan = planSevenStepSpend({
    ...planParams,
    openSlot: 300_000_000n,
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
  console.log("  deposit == x402 maxAmount:", plan.draw.amount === plan.x402.maxAmount);
  console.log("");
  console.log("OK — spend plan built. Run devnet:preflight, then devnet:spend-submit --submit.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
