import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DEVNET_USDC } from "../src/types.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

const PAYEE = "mLmkGgjCasrMHyEmHBKTDptnADhDmvB3y51bauSkQLf";

async function main() {
  const env = loadDevnetEnv();
  const payer = loadKeypair(env.agentKeypairPath);
  const connection = new Connection(env.rpcUrl, "confirmed");
  const mint = new PublicKey(DEVNET_USDC);
  const payee = new PublicKey(PAYEE);
  const ata = getAssociatedTokenAddressSync(mint, payee);
  if (await connection.getAccountInfo(ata)) {
    console.log("payee USDC ATA already exists:", ata.toBase58());
    return;
  }
  const sig = await connection.sendTransaction(
    new Transaction().add(
      createAssociatedTokenAccountInstruction(payer.publicKey, ata, payee, mint),
    ),
    [payer],
  );
  await connection.confirmTransaction(sig, "confirmed");
  console.log("created payee USDC ATA:", ata.toBase58());
  console.log("tx:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
