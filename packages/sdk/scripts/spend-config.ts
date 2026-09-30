/** Shared demo amounts + keys for spend plan / submit scripts. */
import { readFileSync } from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { PlanSevenStepSpendParams } from "../src/spend-plan.js";
import { DEVNET_USDC } from "../src/types.js";
import type { DevnetEnv } from "./load-devnet-env.js";
import {
  DEFAULT_X402_ENDPOINT,
  x402DrawAmountBaseUnits,
  x402SettledEstimate,
} from "../src/x402-merchant.js";

export const DEMO_AMOUNTS = {
  deposit: 10_000_000n,
  /** On-chain-only demos; use `drawForEndpoint()` when x402 is live. */
  draw: 1_000_000n,
  lineLimit: 5_000_000n,
  policySeed: 1n,
  settledEstimate: 250_000n,
} as const;

export function drawForEndpoint(endpoint: string, skipX402 = false): bigint {
  return x402DrawAmountBaseUnits(endpoint, skipX402);
}

export function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function buildDemoSpendParams(env: DevnetEnv, skipX402 = false): {
  lender: Keypair;
  agent: Keypair;
  operator: Keypair;
  planParams: Omit<PlanSevenStepSpendParams, "openSlot">;
} {
  if (!env.agentKeypairPath) {
    throw new Error("AGENT_KEYPAIR_PATH missing in scripts/devnet.env");
  }
  const lender = loadKeypair(env.agentKeypairPath);
  const agent = lender;
  const operator = env.operatorKeypairPath
    ? loadKeypair(env.operatorKeypairPath)
    : Keypair.generate();

  const x402Endpoint = env.x402Endpoint ?? DEFAULT_X402_ENDPOINT;
  const drawAmount = drawForEndpoint(x402Endpoint, skipX402);

  return {
    lender,
    agent,
    operator,
    planParams: {
      lender: lender.publicKey,
      agent: agent.publicKey,
      operator: operator.publicKey,
      mint: new PublicKey(DEVNET_USDC),
      policySeed: DEMO_AMOUNTS.policySeed,
      perCallCap: drawAmount > DEMO_AMOUNTS.draw ? drawAmount : DEMO_AMOUNTS.draw,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400),
      lineLimit: DEMO_AMOUNTS.lineLimit,
      depositAmount: DEMO_AMOUNTS.deposit,
      drawAmount,
      settledEstimate: x402SettledEstimate(drawAmount),
      x402Endpoint,
    },
  };
}
