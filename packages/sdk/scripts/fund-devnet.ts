/** Fund the configured demo agent with devnet SOL and optional playground USDC. */
import { readFileSync } from "node:fs";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv();
  if (env.network !== "devnet") {
    throw new Error(`refusing to request a public airdrop on ${env.network}`);
  }

  const secret = JSON.parse(readFileSync(env.agentKeypairPath, "utf8")) as number[];
  const agent = Keypair.fromSecretKey(Uint8Array.from(secret));
  const { connection, rpcUrl } = await createResilientDevnetConnection(env.rpcUrl);
  console.log("rpc:", rpcUrl);

  const signature = await connection.requestAirdrop(agent.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature, "confirmed");
  console.log("Funded 1 devnet SOL:", agent.publicKey.toBase58());
  console.log("Airdrop signature:", signature);

  if (env.operatorKeypairPath) {
    const operatorSecret = JSON.parse(readFileSync(env.operatorKeypairPath, "utf8")) as number[];
    const operator = Keypair.fromSecretKey(Uint8Array.from(operatorSecret));
    const transferSig = await connection.sendTransaction(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: agent.publicKey,
          toPubkey: operator.publicKey,
          lamports: 200_000_000,
        }),
      ),
      [agent],
    );
    await connection.confirmTransaction(transferSig, "confirmed");
    console.log("Funded operator 0.2 SOL:", operator.publicKey.toBase58());
  }

  console.log("");
  console.log("Devnet USDC (required for deposit):");
  console.log("  https://faucet.circle.com/ → Solana Devnet → paste", agent.publicKey.toBase58());
  console.log("  Mint:", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  console.log("  Need ≥10 USDC for the default seven-step demo deposit.");

  if (!env.playgroundFaucetUrl) {
    console.log("");
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
