/** Check whether devnet is ready for the real Zeta demo without changing state. */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  CREDIT_VAULT_PROGRAM_ID,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
} from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv({ requireAgent: false });
  const connection = new Connection(env.rpcUrl, "confirmed");
  const targets = [
    ["Policy Registry", POLICY_REGISTRY_PROGRAM_ID],
    ["Credit Vault", CREDIT_VAULT_PROGRAM_ID],
    ["Payment Channels", PAYMENT_CHANNELS_PROGRAM_ID],
  ] as const;

  console.log("=== Zeta devnet preflight ===");
  console.log("RPC:", env.rpcUrl);
  let ready = true;
  for (const [name, programId] of targets) {
    const account = await connection.getAccountInfo(new PublicKey(programId));
    const executable = account?.executable === true;
    console.log(`${name}: ${executable ? "ready" : "NOT DEPLOYED"} (${programId})`);
    ready &&= executable;
  }

  console.log("PDA initialization: BLOCKED until the programs provide account allocation.");
  const pdaInitializationReady = false;
  if (!ready || !pdaInitializationReady) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
