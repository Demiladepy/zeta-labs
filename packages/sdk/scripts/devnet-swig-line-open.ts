/**
 * Lender opens a credit line with agent = Swig wallet (after devnet:swig-setup).
 *
 *   npm run devnet:swig-line-open -- --submit
 */
import { PublicKey } from "@solana/web3.js";
import { ZetaClient } from "../src/client.js";
import { decodePool } from "../src/decoder.js";
import { findLinePda, findPoolPda, findPolicyPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadSwigLineGrantState, swigWalletFromState } from "../src/swig/state.js";
import { SwigNotConfiguredError } from "../src/swig/index.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import { firstUnregisteredPolicySeed } from "./swig-line-helpers.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const grant = loadSwigLineGrantState();
  if (!grant) throw new SwigNotConfiguredError();

  const lender = loadKeypair(env.agentKeypairPath);
  const mint = new PublicKey(DEVNET_USDC);
  const pool = findPoolPda(lender.publicKey, mint);
  const swigWallet = swigWalletFromState(grant);
  const line = findLinePda(pool, swigWallet);

  console.log("=== open_line → Swig wallet ===");
  console.log("pool:", pool.toBase58());
  console.log("line:", line.toBase58());
  console.log("swig wallet (agent):", swigWallet.toBase58());

  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);

  const lineInfo = await connection.getAccountInfo(line);
  if (lineInfo) {
    console.log("line already exists — nothing to do");
    return;
  }

  const policySeed = await firstUnregisteredPolicySeed(connection, lender.publicKey);
  const policy = findPolicyPda(lender.publicKey, policySeed);
  console.log("policy seed:", policySeed.toString(), "policy:", policy.toBase58());

  if (!submit) {
    console.log("\nDry-run. Pass --submit to create pool (if needed), policy, and open_line.");
    return;
  }

  const client = new ZetaClient({ connection, payer: lender });
  const poolInfo = await connection.getAccountInfo(pool);
  if (!poolInfo) {
    await client.createPool({ mint });
    console.log("created pool");
  }

  const poolState = decodePool((await connection.getAccountInfo(pool))!.data);
  if (poolState.deposited < DEMO_AMOUNTS.deposit) {
    console.warn("warn: pool deposit low — run devnet:spend-submit or fund pool before draw");
  }

  const policyInfo = await connection.getAccountInfo(policy);
  if (!policyInfo) {
    await client.registerPolicy({
      seed: policySeed,
      perCallCap: DEMO_AMOUNTS.draw,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400 * 30),
    });
    console.log("registered policy");
  }

  const { signature } = await client.openLine({
    pool,
    policy,
    agent: swigWallet,
    limit: DEMO_AMOUNTS.lineLimit,
  });
  console.log("open_line signature:", signature);
  console.log("\nNext: npm run devnet:swig-spend -- --submit --skip-x402");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
