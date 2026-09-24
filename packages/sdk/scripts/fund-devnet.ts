/** Fund the configured demo agent with devnet SOL and optional playground USDC. */
import { readFileSync } from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv();
  if (env.network !== "devnet") {
    throw new Error(`refusing to request a public airdrop on ${env.network}`);
  }

  const secret = JSON.parse(readFileSync(env.agentKeypairPath, "utf8")) as number[];
  const agent = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(env.rpcUrl, "confirmed");

  const signature = await connection.requestAirdrop(agent.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature, "confirmed");
  console.log("Funded 1 devnet SOL:", agent.publicKey.toBase58());
  console.log("Airdrop signature:", signature);

  if (!env.playgroundFaucetUrl) {
    console.log("PLAYGROUND_FAUCET_URL is unset; skipped sandbox USDC funding.");
    return;
  }

  const response = await fetch(env.playgroundFaucetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: agent.publicKey.toBase58() }),
  });
  if (!response.ok) {
    throw new Error(`playground faucet failed (${response.status}): ${await response.text()}`);
  }
  console.log("Funded sandbox USDC through the configured playground faucet.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
