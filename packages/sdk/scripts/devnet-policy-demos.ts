/**
 * Phase-1 deny + revoke explorer demos.
 * Deny runs against the active spend line; revoke uses a disposable policy seed.
 *
 *   npm run devnet:policy-demos -- --submit
 */
import { Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { buildEvaluateInstruction, findPolicyPda } from "../src/instructions.js";
import { ZetaClient } from "../src/client.js";
import { loadKeypair } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { planSevenStepSpend } from "../src/spend-plan.js";
import { resolveActiveSpendParams } from "./resolve-spend-context.js";
import { DEMO_AMOUNTS } from "./spend-config.js";

/** Isolated seed for revoke demo — never used by the live spend path. */
const REVOKE_DEMO_SEED = 99n;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  connection: Connection,
  tx: Transaction,
  signers: Parameters<typeof sendAndConfirmTransaction>[2],
  attempts = 5,
): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await sendAndConfirmTransaction(connection, tx, signers, {
        commitment: "confirmed",
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") && !message.includes("rate limit")) {
        throw error;
      }
      await sleep(1500 * (i + 1));
    }
  }
  throw lastError;
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const connection = new Connection(env.rpcUrl, "confirmed");
  const operator = env.operatorKeypairPath
    ? loadKeypair(env.operatorKeypairPath)
    : loadKeypair(env.agentKeypairPath);

  const resolved = await resolveActiveSpendParams(connection, env, operator);
  const openSlot = BigInt(await connection.getSlot("confirmed"));
  const plan = planSevenStepSpend({ ...resolved.planParams, openSlot });

  console.log("=== Zeta policy demos (deny + revoke) ===");
  console.log("mode:", submit ? "SUBMIT" : "dry-run");
  console.log("active policy:", plan.accounts.policy.toBase58());
  console.log("active line:", plan.accounts.line.toBase58());
  console.log("revoke demo policy seed:", REVOKE_DEMO_SEED.toString());
  console.log("");

  if (!submit) {
    console.log("Dry run. Will send:");
    console.log("  1. evaluate over per-call cap on active line → on-chain deny");
    console.log("  2. register + revoke disposable demo policy (seed 99)");
    console.log("  3. evaluate after revoke on disposable policy → on-chain deny");
    console.log("");
    console.log("Re-run with --submit. Active spend line is not revoked.");
    return;
  }

  const overCap = resolved.planParams.perCallCap + 1n;
  const denyEvaluate = buildEvaluateInstruction({
    policy: plan.accounts.policy,
    line: plan.accounts.line,
    agent: plan.accounts.agent,
    amount: overCap,
    recipient: plan.accounts.operator,
  });

  console.log("1. Deny demo — evaluate above per-call cap (active line)");
  try {
    await sendWithRetry(connection, new Transaction().add(denyEvaluate), [resolved.lender]);
    console.log("   unexpected: transaction succeeded (expected policy deny)");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`   ✓ denied as expected: ${message.slice(0, 200)}`);
  }

  const zeta = new ZetaClient({ connection, payer: resolved.lender, cluster: "devnet" });
  const demoPolicy = findPolicyPda(resolved.lender.publicKey, REVOKE_DEMO_SEED);
  const demoPolicyInfo = await connection.getAccountInfo(demoPolicy);

  console.log("");
  console.log("2. Revoke demo — disposable policy seed", REVOKE_DEMO_SEED.toString());
  if (!demoPolicyInfo) {
    await zeta.registerPolicy({
      seed: REVOKE_DEMO_SEED,
      perCallCap: DEMO_AMOUNTS.draw,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400 * 30),
    });
    console.log("   registered demo policy:", demoPolicy.toBase58());
  }

  const revokeSig = await zeta.revoke(demoPolicy);
  console.log(`   ✓ revoke: ${explorerUrl(revokeSig.signature)}`);

  await sleep(2000);

  const postRevokeEvaluate = buildEvaluateInstruction({
    policy: demoPolicy,
    line: plan.accounts.line,
    agent: plan.accounts.agent,
    amount: resolved.planParams.drawAmount,
    recipient: plan.accounts.operator,
  });

  console.log("");
  console.log("3. Post-revoke evaluate on disposable policy");
  try {
    await sendWithRetry(connection, new Transaction().add(postRevokeEvaluate), [resolved.lender]);
    console.log("   unexpected: transaction succeeded (expected revoke deny)");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`   ✓ denied as expected: ${message.slice(0, 200)}`);
  }

  console.log("");
  console.log("OK — policy demos finished (active spend line unchanged).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
