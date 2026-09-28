/**
 * Lender opens a credit line with agent = Swig wallet (after devnet:swig-setup).
 *
 *   npm run devnet:swig-line-open -- --submit
 */
import { PublicKey } from "@solana/web3.js";
import { ZetaClient } from "../src/client.js";
import { decodeLine, decodePool } from "../src/decoder.js";
import type { SwigLineGrantState } from "../src/swig/state.js";
import { findLinePda, findPoolPda, findPolicyPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadSwigLineGrantState, saveSwigLineGrantState, swigWalletFromState } from "../src/swig/state.js";
import { SwigNotConfiguredError } from "../src/swig/index.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import { firstUnregisteredPolicySeed } from "./swig-line-helpers.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const MAX_RETRIES = 3;
const INTER_STEP_DELAY_MS = 3000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function persistGrantAddresses(
  grant: SwigLineGrantState,
  pool: PublicKey,
  line: PublicKey,
  lineInfo: { data: Buffer },
): void {
  const decoded = decodeLine(lineInfo.data);
  saveSwigLineGrantState({
    ...grant,
    pool: pool.toBase58(),
    creditLine: line.toBase58(),
    policy: new PublicKey(decoded.policy).toBase58(),
  });
}

function isExpiredError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("expired") ||
    msg.includes("block height") ||
    msg.includes("Blockhash not found") ||
    msg.includes("timeout")
  );
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
    persistGrantAddresses(grant, pool, line, lineInfo);
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

  // --- Step 1: Ensure pool exists ---
  const poolInfo = await connection.getAccountInfo(pool);
  if (!poolInfo) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await client.createPool({ mint });
        console.log("created pool");
        break;
      } catch (error) {
        if (isExpiredError(error) && attempt < MAX_RETRIES) {
          console.warn(`  create_pool attempt ${attempt} expired — checking if landed...`);
          await sleep(INTER_STEP_DELAY_MS);
          const check = await connection.getAccountInfo(pool);
          if (check) { console.log("  pool confirmed on-chain (landed despite timeout)"); break; }
          console.warn(`  retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        throw error;
      }
    }
    await sleep(INTER_STEP_DELAY_MS);
  }

  const poolState = decodePool((await connection.getAccountInfo(pool))!.data);
  if (poolState.deposited < DEMO_AMOUNTS.deposit) {
    console.warn("warn: pool deposit low — run devnet:spend-submit or fund pool before draw");
  }

  // --- Step 2: Register policy ---
  const policyInfo = await connection.getAccountInfo(policy);
  if (!policyInfo) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await client.registerPolicy({
          seed: policySeed,
          perCallCap: DEMO_AMOUNTS.draw,
          expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86_400 * 30),
        });
        console.log("registered policy");
        break;
      } catch (error) {
        if (isExpiredError(error) && attempt < MAX_RETRIES) {
          console.warn(`  register_policy attempt ${attempt} expired — checking if landed...`);
          await sleep(INTER_STEP_DELAY_MS);
          const check = await connection.getAccountInfo(policy);
          if (check) { console.log("  policy confirmed on-chain (landed despite timeout)"); break; }
          console.warn(`  retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        throw error;
      }
    }
    await sleep(INTER_STEP_DELAY_MS);
  }

  // --- Step 3: Open line (with retry) ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Re-check in case a prior expired attempt actually landed
    const existingLine = await connection.getAccountInfo(line);
    if (existingLine) {
      console.log("line confirmed on-chain (landed despite prior timeout)");
      break;
    }
    try {
      const { signature } = await client.openLine({
        pool,
        policy,
        agent: swigWallet,
        limit: DEMO_AMOUNTS.lineLimit,
      });
      console.log("open_line signature:", signature);
      break;
    } catch (error) {
      if (isExpiredError(error) && attempt < MAX_RETRIES) {
        console.warn(`  open_line attempt ${attempt} expired — will retry...`);
        await sleep(INTER_STEP_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  // --- Step 4: Ensure swigWallet has SOL for paying channel rent ---
  const swigBalance = await connection.getBalance(swigWallet, "confirmed");
  if (swigBalance < 50_000_000) {
    console.log("funding swigWallet with rent lamports...");
    const { sendTransactionHttp } = await import("../src/devnet-rpc.js");
    const { SystemProgram } = await import("@solana/web3.js");
    await sendTransactionHttp(connection, lender, [
      SystemProgram.transfer({
        fromPubkey: lender.publicKey,
        toPubkey: swigWallet,
        lamports: 50_000_000 - swigBalance,
      }),
    ]);
    console.log("swigWallet funded.");
  }

  const finalLine = await connection.getAccountInfo(line);
  if (finalLine) {
    persistGrantAddresses(grant, pool, line, finalLine);
    console.log("saved pool/line/policy to swig-line-grant.json (for dashboard + M4)");
  }

  console.log("\nNext: npm run devnet:swig-spend -- --submit --skip-x402");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
