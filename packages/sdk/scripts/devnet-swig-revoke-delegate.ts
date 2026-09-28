/**
 * Phase 2 M4: lender revokes Swig delegate; spend must fail afterward.
 *
 *   npm run devnet:swig-revoke-delegate -- --submit
 *   npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail
 */
import { PublicKey } from "@solana/web3.js";
import { findLinePda, findPoolPda } from "../src/instructions.js";
import { DEVNET_USDC } from "../src/types.js";
import { SwigNotConfiguredError } from "../src/swig/index.js";
import {
  loadSwigLineGrantState,
  saveSwigLineGrantState,
  swigWalletFromState,
} from "../src/swig/state.js";
import { removeSwigSpendDelegate } from "../src/swig/wallet.js";
import { submitAgentSpend } from "../src/spend-submit.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { DEMO_AMOUNTS, loadKeypair } from "./spend-config.js";
import { loadOrCreateSpendAgent } from "./resolve-spend-context.js";
import { resolveSpendAuthority } from "./spend-authority-env.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const expectSpendFail = hasFlag("--expect-spend-fail");
  const grant = loadSwigLineGrantState();
  if (!grant) throw new SwigNotConfiguredError();

  const lender = loadKeypair(env.agentKeypairPath);
  const delegate = loadOrCreateSpendAgent(lender);
  const operator = env.operatorKeypairPath
    ? loadKeypair(env.operatorKeypairPath)
    : (() => {
        throw new Error("OPERATOR_KEYPAIR_PATH required");
      })();

  console.log("=== Swig delegate revoke (Phase 2 M4) ===");
  console.log("lender:", lender.publicKey.toBase58());
  console.log("delegate:", delegate.publicKey.toBase58());
  console.log("swig wallet:", grant.swigWallet);
  if (grant.delegateRevokedAt) {
    console.log("already revoked at:", grant.delegateRevokedAt);
    if (!expectSpendFail) return;
  }

  if (!submit) {
    console.log("\nDry-run. Pass --submit to remove delegate on-chain.");
    console.log("Optional: --expect-spend-fail to prove devnet:swig-spend errors after revoke.");
    return;
  }

  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);

  if (!grant.delegateRevokedAt) {
    const { signature } = await removeSwigSpendDelegate({ connection, lender, state: grant });
    grant.delegateRevokedAt = new Date().toISOString();
    grant.removeDelegateSignature = signature;
    saveSwigLineGrantState(grant);
    console.log("\nremove_delegate:", signature);
    console.log(
      "explorer:",
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  }

  if (!expectSpendFail) {
    console.log("\nRe-run with --expect-spend-fail to verify spend is blocked.");
    return;
  }

  const mint = new PublicKey(DEVNET_USDC);
  const pool = findPoolPda(lender.publicKey, mint);
  const swigWallet = swigWalletFromState(grant);
  const line = grant.creditLine
    ? new PublicKey(grant.creditLine)
    : findLinePda(pool, swigWallet);

  try {
    await submitAgentSpend({
      connection,
      agent: delegate,
      authority: resolveSpendAuthority(env, delegate),
      operator,
      line,
      amount: DEMO_AMOUNTS.draw,
      endpoint: env.x402Endpoint ?? "",
      settledEstimate: DEMO_AMOUNTS.settledEstimate,
      skipX402: true,
      network: "devnet",
      cluster: "devnet",
    });
    console.error("\nFAIL: spend succeeded after delegate revoke (unexpected)");
    process.exit(1);
  } catch (error) {
    console.log("\nOK — spend failed after revoke (expected):");
    console.log(error instanceof Error ? error.message : error);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
