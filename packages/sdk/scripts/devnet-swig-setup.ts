/**
 * On-chain Swig setup: lender root + spend-agent delegate (credit-vault + channels).
 *
 *   npm run devnet:swig-setup -- --submit
 */
import { createSwigWalletForLineGrant } from "../src/swig/index.js";
import { swigGrantStatePath } from "../src/swig/state.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";
import { loadOrCreateSpendAgent } from "./resolve-spend-context.js";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const env = loadDevnetEnv();
  const submit = hasFlag("--submit");
  const lender = loadKeypair(env.agentKeypairPath);
  const delegate = loadOrCreateSpendAgent(lender);

  console.log("=== Swig line-grant setup ===");
  console.log("lender:", lender.publicKey.toBase58());
  console.log("delegate (spend-agent):", delegate.publicKey.toBase58());
  console.log("mode:", submit ? "SUBMIT" : "dry-run (pass --submit)");

  if (!submit) {
    console.log("\nWill create Swig on devnet and save", swigGrantStatePath());
    return;
  }

  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);

  let result;
  try {
    result = await createSwigWalletForLineGrant({ connection, lender, delegate });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.includes("expired") || msg.includes("block height")) {
      console.error("\nRPC rate-limited or slow. Fix:");
      console.error("  1. Set RPC_URL=https://api.devnet.solana.com in scripts/devnet.env");
      console.error("  2. Or add HELIUS_API_KEY=... (free at https://helius.dev)");
      console.error("  3. Re-run: npm run devnet:swig-setup -- --submit");
    }
    throw error;
  }
  console.log("\nSwig account:", result.state.swigAccount);
  console.log("Swig wallet (use as line.agent):", result.state.swigWallet);
  console.log("delegate role id:", result.state.delegateRoleId);
  console.log("\nCreate tx:", result.createSignature);
  console.log("Add delegate tx:", result.addDelegateSignature);
  console.log("\nState saved:", swigGrantStatePath());
  console.log("\nNext: npm run devnet:swig-line-open -- --submit");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
