import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { loadKeypair } from "./spend-config.js";

const FEE_PAYER = "mLmkGgjCasrMHyEmHBKTDptnADhDmvB3y51bauSkQLf";

async function main() {
  const env = loadDevnetEnv();
  const lender = loadKeypair(env.agentKeypairPath);
  const connection = new Connection(env.rpcUrl, "confirmed");
  const feePayer = new PublicKey(FEE_PAYER);
  const before = await connection.getBalance(feePayer);
  console.log("fee payer before:", before / 1e9, "SOL");
  const sig = await connection.sendTransaction(
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: lender.publicKey,
        toPubkey: feePayer,
        lamports: 500_000_000,
      }),
    ),
    [lender],
  );
  await connection.confirmTransaction(sig, "confirmed");
  const after = await connection.getBalance(feePayer);
  console.log("fee payer after:", after / 1e9, "SOL");
  console.log("tx:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
