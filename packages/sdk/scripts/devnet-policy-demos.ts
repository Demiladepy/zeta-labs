/**
 * Phase-1 deny + revoke explorer demos.
 * Deny runs against the active spend line; revoke uses a disposable policy seed.
 *
 *   npm run devnet:policy-demos -- --submit
 */
import { Connection, Transaction } from "@solana/web3.js";
import { buildEvaluateInstruction, findPolicyPda } from "../src/instructions.js";
import { ZetaClient } from "../src/client.js";
import { loadKeypair } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { planSevenStepSpend } from "../src/spend-plan.js";
import { resolveActiveSpendParams } from "./resolve-spend-context.js";
import { DEMO_AMOUNTS } from "./spend-config.js";

/** Isolated seeds for revoke demo — never used by the live spend path. */
const REVOKE_DEMO_SEED_BASE = 99n;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Send an expected-to-fail policy evaluate so it still lands on-chain for Explorer. */
async function sendExpectedDeny(
  connection: Connection,
  tx: Transaction,
  signers: { publicKey: import("@solana/web3.js").PublicKey; secretKey: Uint8Array }[],
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = signers[0]!.publicKey;
  tx.sign(...signers);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  const status = await connection.getSignatureStatus(signature);
  const err = status?.value?.err;
  if (!err) {
    throw new Error(`expected on-chain deny, but tx succeeded: ${explorerUrl(signature)}`);
  }
  return signature;
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
  console.log("");

  if (!submit) {
    console.log("Dry run. Will send:");
    console.log("  1. evaluate over per-call cap on active line → on-chain deny");
    console.log("  2. register + revoke disposable demo policy (seed ≥ 99)");
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
  {
    const denySig = await sendExpectedDeny(
      connection,
      new Transaction().add(denyEvaluate),
      [resolved.lender],
    );
    console.log(`   ✓ deny (PerCallCap on-chain): ${explorerUrl(denySig)}`);
  }

  const zeta = new ZetaClient({ connection, payer: resolved.lender, cluster: "devnet" });

  let revokeSeed = REVOKE_DEMO_SEED_BASE;
  let demoPolicy = findPolicyPda(resolved.lender.publicKey, revokeSeed);
  for (let i = 0; i < 20; i++) {
    revokeSeed = REVOKE_DEMO_SEED_BASE + BigInt(i);
    demoPolicy = findPolicyPda(resolved.lender.publicKey, revokeSeed);
    const info = await connection.getAccountInfo(demoPolicy);
    if (!info) break;
    // Policy.revoked at byte 82 (INTERFACE layout).
    if (info.data.length >= 83 && info.data[82] === 0) break;
  }

  console.log("");
  console.log("2. Revoke demo — disposable policy seed", revokeSeed.toString());
  const demoPolicyInfo = await connection.getAccountInfo(demoPolicy);
  if (!demoPolicyInfo) {
    await zeta.registerPolicy({
      seed: revokeSeed,
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
  {
    const postSig = await sendExpectedDeny(
      connection,
      new Transaction().add(postRevokeEvaluate),
      [resolved.lender],
    );
    console.log(`   ✓ post_revoke_deny: ${explorerUrl(postSig)}`);
  }

  console.log("");
  console.log("OK — policy demos finished (active spend line unchanged).");
  console.log("Paste deny + revoke explorer URLs into docs/PROOF.md.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
