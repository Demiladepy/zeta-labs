/**
 * Pick a live agent + policy seed for devnet submit.
 * Reuses an existing non-revoked credit line when possible.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { decodeLine, decodePolicy } from "../src/decoder.js";
import { findLinePda, findPolicyPda, findPoolPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import type { PlanSevenStepSpendParams } from "../src/spend-plan.js";
import { DEMO_AMOUNTS, drawForEndpoint, loadKeypair } from "./spend-config.js";
import { DEFAULT_X402_ENDPOINT, x402SettledEstimate } from "../src/x402-merchant.js";
import type { DevnetEnv } from "./load-devnet-env.js";

const SPEND_AGENT_PATH = resolve(import.meta.dirname, "../../../.keys/spend-agent.json");

export type ResolvedSpendAccounts = {
  pool: PublicKey;
  policy: PublicKey;
  line: PublicKey;
  policySeed: bigint;
};

export function loadOrCreateSpendAgent(lender: Keypair): Keypair {
  if (existsSync(SPEND_AGENT_PATH)) {
    return loadKeypair(SPEND_AGENT_PATH);
  }
  const agent = Keypair.generate();
  mkdirSync(dirname(SPEND_AGENT_PATH), { recursive: true });
  writeFileSync(SPEND_AGENT_PATH, JSON.stringify(Array.from(agent.secretKey)));
  console.log("Created spend-agent keypair:", agent.publicKey.toBase58());
  console.log("  saved to", SPEND_AGENT_PATH);
  return agent;
}

async function policyAtSeed(
  connection: Connection,
  issuer: PublicKey,
  seed: bigint,
): Promise<{ policy: PublicKey; revoked: boolean; exists: boolean }> {
  const policy = findPolicyPda(issuer, seed);
  const info = await connection.getAccountInfo(policy);
  if (!info) return { policy, revoked: false, exists: false };
  return { policy, revoked: decodePolicy(info.data).revoked, exists: true };
}

async function activeLineContext(
  connection: Connection,
  pool: PublicKey,
  agent: PublicKey,
): Promise<{ policySeed: bigint; policy: PublicKey; line: PublicKey } | null> {
  const line = findLinePda(pool, agent);
  const lineInfo = await connection.getAccountInfo(line);
  if (!lineInfo) return null;

  const lineState = decodeLine(lineInfo.data);
  const policy = new PublicKey(lineState.policy);
  const policyInfo = await connection.getAccountInfo(policy);
  if (!policyInfo) return null;

  const policyState = decodePolicy(policyInfo.data);
  if (policyState.revoked) return null;

  return { policySeed: policyState.seed, policy, line };
}

async function firstUnregisteredPolicySeed(
  connection: Connection,
  issuer: PublicKey,
  start = 1n,
): Promise<bigint> {
  for (let seed = start; seed <= 64n; seed++) {
    const { exists } = await policyAtSeed(connection, issuer, seed);
    if (!exists) return seed;
  }
  throw new Error("no free policy seed (1..64) for issuer " + issuer.toBase58());
}

async function resolveAgentAndPolicy(
  connection: Connection,
  lender: Keypair,
  pool: PublicKey,
): Promise<{ agent: Keypair; policySeed: bigint }> {
  const lenderLine = await activeLineContext(connection, pool, lender.publicKey);
  if (lenderLine) {
    return { agent: lender, policySeed: lenderLine.policySeed };
  }

  const spendAgent = loadOrCreateSpendAgent(lender);
  const spendLine = await activeLineContext(connection, pool, spendAgent.publicKey);
  if (spendLine) {
    if (!lenderLine) {
      console.log("");
      console.log("Using spend-agent with existing active line:");
      console.log("  spend-agent:", spendAgent.publicKey.toBase58());
      console.log("  policy seed:", spendLine.policySeed.toString());
      console.log("");
    }
    return { agent: spendAgent, policySeed: spendLine.policySeed };
  }

  const defaultPolicy = await policyAtSeed(connection, lender.publicKey, DEMO_AMOUNTS.policySeed);
  if (!defaultPolicy.exists) {
    return { agent: lender, policySeed: DEMO_AMOUNTS.policySeed };
  }
  if (!defaultPolicy.revoked) {
    return { agent: lender, policySeed: DEMO_AMOUNTS.policySeed };
  }

  const policySeed = await firstUnregisteredPolicySeed(connection, lender.publicKey, 2n);
  console.log("");
  console.log("Lender policy/line unavailable — provisioning spend-agent:");
  console.log("  spend-agent:", spendAgent.publicKey.toBase58());
  console.log("  policy seed:", policySeed.toString());
  console.log("");
  return { agent: spendAgent, policySeed };
}

export async function resolveActiveSpendParams(
  connection: Connection,
  env: DevnetEnv,
  operator: Keypair,
  options: { skipX402?: boolean } = {},
): Promise<{
  lender: Keypair;
  agent: Keypair;
  operator: Keypair;
  planParams: Omit<PlanSevenStepSpendParams, "openSlot">;
  accounts: ResolvedSpendAccounts;
}> {
  const lender = loadKeypair(env.agentKeypairPath);
  const mint = new PublicKey(DEVNET_USDC);
  const pool = findPoolPda(lender.publicKey, mint);

  const { agent, policySeed } = await resolveAgentAndPolicy(connection, lender, pool);
  const policy = findPolicyPda(lender.publicKey, policySeed);
  const line = findLinePda(pool, agent.publicKey);
  const x402Endpoint = env.x402Endpoint ?? DEFAULT_X402_ENDPOINT;
  const drawAmount = drawForEndpoint(x402Endpoint, options.skipX402 ?? false);

  return {
    lender,
    agent,
    operator,
    accounts: { pool, policy, line, policySeed },
    planParams: {
      lender: lender.publicKey,
      agent: agent.publicKey,
      operator: operator.publicKey,
      mint,
      policySeed,
      perCallCap: drawAmount > DEMO_AMOUNTS.draw ? drawAmount : DEMO_AMOUNTS.draw,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400 * 30),
      lineLimit: DEMO_AMOUNTS.lineLimit,
      depositAmount: DEMO_AMOUNTS.deposit,
      drawAmount,
      settledEstimate: x402SettledEstimate(drawAmount),
      x402Endpoint,
    },
  };
}

export function printDashboardConfig(args: {
  rpcUrl: string;
  lender: PublicKey;
  agent: PublicKey;
  operator: PublicKey;
  accounts: ResolvedSpendAccounts;
}): void {
  console.log("");
  console.log("=== Dashboard config (send to Joshna) ===");
  console.log("RPC URL:  ", args.rpcUrl);
  console.log("Pool:     ", args.accounts.pool.toBase58());
  console.log("Policy:   ", args.accounts.policy.toBase58());
  console.log("Line:     ", args.accounts.line.toBase58());
  console.log("Lender:   ", args.lender.toBase58());
  console.log("Agent:    ", args.agent.toBase58());
  console.log("Operator: ", args.operator.toBase58());
  console.log("");
}
