import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

async function main() {
  const env = loadDevnetEnv();
  const agent = loadKeypair(env.agentKeypairPath);
  const connection = new Connection(env.rpcUrl, "confirmed");
  const mint = new PublicKey(DEVNET_USDC);
  const accounts = await connection.getParsedTokenAccountsByOwner(agent.publicKey, { mint });
  let total = 0n;
  for (const { pubkey, account } of accounts.value) {
    const info = account.data.parsed.info.tokenAmount;
    total += BigInt(info.amount);
    console.log(pubkey.toBase58(), info.uiAmountString ?? info.amount);
  }
  console.log("owner:", agent.publicKey.toBase58());
  console.log("USDC base units total:", total.toString());
  if (total < 100_000n) {
    console.error("\nNeed ≥100_000 base units for x402 summarize. Fund via https://faucet.circle.com/");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
