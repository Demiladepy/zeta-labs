/** Print Connection settings for the Swig proof line (dashboard paste). */
import { PublicKey } from "@solana/web3.js";
import { decodeLine } from "../src/decoder.js";
import { loadSwigLineGrantState } from "../src/swig/state.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv({ requireAgent: false });
  const grant = loadSwigLineGrantState();
  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);

  const linePk = new PublicKey(
    grant?.creditLine ?? "9nc1MRMEoxKs9GQvTtk72xDa4zqzpCX9qTknBj1RdjpF",
  );
  const poolPk = new PublicKey(
    grant?.pool ?? "4tPUrLPZpsBv2J6YnkdAthQGbXNG7moiNCHVCKFKcz2j",
  );
  const lineInfo = await connection.getAccountInfo(linePk);
  if (!lineInfo) throw new Error("credit line not found on RPC");
  const policy = new PublicKey(decodeLine(lineInfo.data).policy).toBase58();

  console.log("=== Dashboard Connection settings (Swig proof line) ===");
  console.log("RPC URL:     ", rpcUrl);
  console.log("Pool:        ", poolPk.toBase58());
  console.log("Credit line: ", linePk.toBase58());
  console.log("Policy:      ", policy);
  console.log("Agent (Swig wallet):", new PublicKey(decodeLine(lineInfo.data).agent).toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
