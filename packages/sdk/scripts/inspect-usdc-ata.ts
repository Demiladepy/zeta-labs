import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

async function main() {
  const env = loadDevnetEnv();
  const agent = loadKeypair(env.agentKeypairPath);
  const conn = new Connection(env.rpcUrl, "confirmed");
  const mint = new PublicKey(DEVNET_USDC);
  const atas = await conn.getParsedTokenAccountsByOwner(agent.publicKey, { mint });
  for (const a of atas.value) {
    const p = a.account.data.parsed.info;
    console.log("ata", a.pubkey.toBase58());
    console.log("mint", p.mint);
    console.log("amount", p.tokenAmount.amount);
    console.log("token program", a.account.owner.toBase58());
  }
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const payee = new PublicKey("mLmkGgjCasrMHyEmHBKTDptnADhDmvB3y51bauSkQLf");
  const payeeAta = getAssociatedTokenAddressSync(mint, payee);
  const info = await conn.getAccountInfo(payeeAta);
  console.log("playground payee USDC ATA", payeeAta.toBase58(), info ? "exists" : "MISSING");
}

main();
