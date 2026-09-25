/**
 * Phase-1 deny + revoke explorer demos (after seven-step setup exists).
 *
 *   npm run devnet:policy-demos -- --submit
 */
import { Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { buildEvaluateInstruction } from "../src/instructions.js";
import { ZetaClient } from "../src/client.js";
import { buildDemoSpendParams } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { planSevenStepSpend } from "../src/spend-plan.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const { lender, agent, operator, planParams } = buildDemoSpendParams(env);
  const connection = new Connection(env.rpcUrl, "confirmed");
  const openSlot = BigInt(await connection.getSlot("confirmed"));
  const plan = planSevenStepSpend({ ...planParams, openSlot });

  console.log("=== Zeta policy demos (deny + revoke) ===");
  console.log("warning: revoke will block the default lender line until spend-submit rotates spend-agent.");
  console.log("mode:", submit ? "SUBMIT" : "dry-run");
  console.log("policy:", plan.accounts.policy.toBase58());
  console.log("line:", plan.accounts.line.toBase58());
  console.log("");

  if (!submit) {
    console.log("Dry run. Will send:");
    console.log("  1. evaluate over per-call cap → expect on-chain deny");
    console.log("  2. revoke policy → explorer link");
    console.log("  3. evaluate after revoke → expect on-chain deny");
    console.log("");
    console.log("Re-run with --submit after devnet:spend-submit succeeds.");
    return;
  }

  const overCap = planParams.perCallCap + 1n;
  const denyEvaluate = buildEvaluateInstruction({
    policy: plan.accounts.policy,
    line: plan.accounts.line,
    agent: plan.accounts.agent,
    amount: overCap,
    recipient: plan.accounts.operator,
  });

  console.log("1. Deny demo — evaluate above per-call cap");
  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(denyEvaluate),
      [lender],
      { commitment: "confirmed" },
    );
    console.log("   unexpected: transaction succeeded (expected policy deny)");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`   ✓ denied as expected: ${message.slice(0, 160)}`);
  }

  const zeta = new ZetaClient({ connection, payer: lender, cluster: "devnet" });
  console.log("");
  console.log("2. Revoke demo");
  const revokeSig = await zeta.revoke(plan.accounts.policy);
  console.log(`   ✓ revoke: ${explorerUrl(revokeSig.signature)}`);

  const postRevokeEvaluate = buildEvaluateInstruction({
    policy: plan.accounts.policy,
    line: plan.accounts.line,
    agent: plan.accounts.agent,
    amount: planParams.drawAmount,
    recipient: plan.accounts.operator,
  });

  console.log("");
  console.log("3. Post-revoke evaluate");
  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(postRevokeEvaluate),
      [lender],
      { commitment: "confirmed" },
    );
    console.log("   unexpected: transaction succeeded (expected revoke deny)");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`   ✓ denied as expected: ${message.slice(0, 160)}`);
  }

  console.log("");
  console.log("OK — policy demos finished.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
