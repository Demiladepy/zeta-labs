/**
 * Phase 2 prep: spend on an existing line using only the agent/delegate keys
 * (lender is NOT a signer on evaluate → draw → settle → repay).
 *
 *   npm run devnet:agent-spend -- --submit --skip-x402
 */
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { submitAgentSpend } from "../src/spend-submit.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadOrCreateSpendAgent, printDashboardConfig, resolveActiveSpendParams } from "./resolve-spend-context.js";
import { resolveSpendAuthority } from "./spend-authority-env.js";
import { findLinePda, findPolicyPda, findPoolPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import { PublicKey } from "@solana/web3.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const skipX402 = hasFlag("--skip-x402");
  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  const operator = env.operatorKeypairPath
    ? loadKeypair(env.operatorKeypairPath)
    : (() => {
        throw new Error("OPERATOR_KEYPAIR_PATH required for devnet:agent-spend");
      })();

  const lender = loadKeypair(env.agentKeypairPath);
  const spendAgent = loadOrCreateSpendAgent(lender);
  const authority = resolveSpendAuthority(env, spendAgent);

  console.log("=== Zeta delegated agent spend (Phase 2 prep) ===");
  console.log("mode:", submit ? "SUBMIT" : "dry-run (pass --submit)");
  console.log("authority:", authority.kind);
  console.log("signing key:", spendAgent.publicKey.toBase58());
  console.log("lender (not in spend txs):", lender.publicKey.toBase58());
  console.log("");

  if (!submit) {
    const mint = new PublicKey(DEVNET_USDC);
    const pool = findPoolPda(lender.publicKey, mint);
    const policy = findPolicyPda(lender.publicKey, DEMO_AMOUNTS.policySeed);
    const line = findLinePda(pool, spendAgent.publicKey);
    console.log("Dry-run (no RPC). Planned accounts from local keys:");
    printDashboardConfig({
      rpcUrl: env.rpcUrl,
      lender: lender.publicKey,
      agent: spendAgent.publicKey,
      operator: operator.publicKey,
      accounts: { pool, policy, line, policySeed: DEMO_AMOUNTS.policySeed },
    });
    console.log("Re-run with --submit --skip-x402 when devnet RPC is healthy.");
    return;
  }

  const resolved = await resolveActiveSpendParams(connection, env, operator);
  if (resolved.agent.publicKey.equals(resolved.lender.publicKey)) {
    console.warn(
      "warn: agent is the lender key — run full devnet:spend-submit once to provision .keys/spend-agent.json",
    );
  }

  const submitAuthority = resolveSpendAuthority(env, resolved.agent);
  const result = await submitAgentSpend({
    connection,
    agent: resolved.agent,
    authority: submitAuthority,
    operator,
    line: resolved.accounts.line,
    amount: DEMO_AMOUNTS.draw,
    endpoint: resolved.planParams.x402Endpoint ?? env.x402Endpoint ?? "",
    settledEstimate: DEMO_AMOUNTS.settledEstimate,
    skipX402,
    network: env.network === "mainnet" ? "mainnet" : env.network === "localnet" ? "localnet" : "devnet",
    cluster: "devnet",
  });

  console.log("");
  for (const step of result.steps) {
    if (step.explorerUrl) console.log(`  ${step.name}: ${step.explorerUrl}`);
    else if (step.skipped) console.log(`  ${step.name}: skipped`);
  }
  console.log("OK — agent spend finished (lender was not a signer).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
