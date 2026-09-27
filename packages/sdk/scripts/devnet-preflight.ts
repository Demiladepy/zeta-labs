/** Check whether devnet is ready for the real Zeta demo without changing state. */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  CREDIT_VAULT_PROGRAM_ID,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
} from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function getAccountInfoWithRetry(
  connection: Connection,
  pubkey: PublicKey,
  attempts = 4,
): Promise<Awaited<ReturnType<Connection["getAccountInfo"]>>> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await connection.getAccountInfo(pubkey);
    } catch (e) {
      last = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw last;
}

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
  console.log("Network:", env.network ?? "devnet");
  let ready = true;
  for (const [name, programId] of targets) {
    const account = await getAccountInfoWithRetry(connection, new PublicKey(programId));
    const executable = account?.executable === true;
    console.log(`${name}: ${executable ? "ready" : "NOT DEPLOYED"} (${programId})`);
    ready &&= executable;
  }

  console.log("PDA initialization: program-side (see docs/PDA.md)");
  if (!ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  console.error(
    "\nIf you see fetch failed, set RPC_URL in scripts/devnet.env to a devnet provider (Helius, QuickNode, etc.).",
  );
  process.exitCode = 1;
});
