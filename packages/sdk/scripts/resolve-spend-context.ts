/**
 * Pick a live agent + policy seed for devnet submit when the default line/policy
 * was revoked by policy-demos.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { decodeLine, decodePolicy } from "../src/decoder.js";
import { findLinePda, findPolicyPda, findPoolPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import type { PlanSevenStepSpendParams } from "../src/spend-plan.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import type { DevnetEnv } from "./load-devnet-env.js";

const SPEND_AGENT_PATH = resolve(import.meta.dirname, "../../../.keys/spend-agent.json");

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

async function findNextPolicySeed(
  connection: Connection,
  issuer: PublicKey,
  start = 1n,
): Promise<bigint> {
  for (let seed = start; seed <= 64n; seed++) {
    const policy = findPolicyPda(issuer, seed);
    const info = await connection.getAccountInfo(policy);
    if (!info) return seed;
  }
  throw new Error("no free policy seed (1..64) for issuer " + issuer.toBase58());
}

async function lineUsesRevokedPolicy(
  connection: Connection,
  pool: PublicKey,
  agent: PublicKey,
): Promise<boolean> {
  const lineInfo = await connection.getAccountInfo(findLinePda(pool, agent));
  if (!lineInfo) return false;
  const line = decodeLine(lineInfo.data);
  const policyInfo = await connection.getAccountInfo(new PublicKey(line.policy));
  if (!policyInfo) return false;
  return decodePolicy(policyInfo.data).revoked;
}

export async function resolveActiveSpendParams(
  connection: Connection,
  env: DevnetEnv,
  operator: Keypair,
): Promise<{
  lender: Keypair;
  agent: Keypair;
  operator: Keypair;
  planParams: Omit<PlanSevenStepSpendParams, "openSlot">;
}> {
  const lender = loadKeypair(env.agentKeypairPath);
  const mint = new PublicKey(DEVNET_USDC);
  const pool = findPoolPda(lender.publicKey, mint);

  let agent = lender;
  let policySeed: bigint = DEMO_AMOUNTS.policySeed;

  const lenderLineRevoked = await lineUsesRevokedPolicy(connection, pool, lender.publicKey);
  if (lenderLineRevoked) {
    agent = loadOrCreateSpendAgent(lender);
    policySeed = await findNextPolicySeed(connection, lender.publicKey, 2n);
    console.log("");
    console.log("Lender line is revoked — using spend-agent for a fresh line:");
    console.log("  spend-agent:", agent.publicKey.toBase58());
    console.log("  policy seed:", policySeed.toString());
    console.log("");
  } else {
    const policy = findPolicyPda(lender.publicKey, policySeed);
    const policyInfo = await connection.getAccountInfo(policy);
    if (policyInfo && decodePolicy(policyInfo.data).revoked) {
      policySeed = await findNextPolicySeed(connection, lender.publicKey, policySeed + 1n);
      console.log("");
      console.log("Default policy is revoked — registering seed", policySeed.toString());
      console.log("");
    }
  }

  const agentLineRevoked = await lineUsesRevokedPolicy(connection, pool, agent.publicKey);
  if (agentLineRevoked) {
    throw new Error(
      `spend-agent line ${findLinePda(pool, agent.publicKey).toBase58()} is also revoked. ` +
        "Use a new spend-agent keypair or register a higher policy seed.",
    );
  }

  return {
    lender,
    agent,
    operator,
    planParams: {
      lender: lender.publicKey,
      agent: agent.publicKey,
      operator: operator.publicKey,
      mint,
      policySeed,
      perCallCap: DEMO_AMOUNTS.draw,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400 * 30),
      lineLimit: DEMO_AMOUNTS.lineLimit,
      depositAmount: DEMO_AMOUNTS.deposit,
      drawAmount: DEMO_AMOUNTS.draw,
      settledEstimate: DEMO_AMOUNTS.settledEstimate,
      x402Endpoint: env.x402Endpoint ?? "http://127.0.0.1:3000/api/v1/summarize",
    },
  };
}
