/**
 * HTTP x402 helpers for the seven-step path.
 *
 * Vault `draw` opens a Payment Channel with the **pool PDA** as token payer.
 * Playground `upto` (summarize) expects PayKitClient to open a **wallet** channel,
 * so integrated submit uses fixed-price routes (`fortune`, `quote`) with `exact`.
 * Standalone `npm run x402:smoke` can target summarize when the agent holds USDC.
 */
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { sendTransactionHttp } from "../devnet-rpc.js";
import { x402IsMeteredUptoEndpoint } from "../x402-merchant.js";
import { fetchPaidEndpoint } from "./x402.js";

export async function ensureAgentUsdcForExactX402(
  connection: Connection,
  funder: Keypair,
  agent: PublicKey,
  mint: PublicKey,
  minBaseUnits: bigint,
): Promise<void> {
  const agentAta = getAssociatedTokenAddressSync(mint, agent);
  const funderAta = getAssociatedTokenAddressSync(mint, funder.publicKey);

  const agentInfo = await connection.getAccountInfo(agentAta);
  if (!agentInfo) {
    const ix = createAssociatedTokenAccountInstruction(
      funder.publicKey,
      agentAta,
      agent,
      mint,
    );
    await sendTransactionHttp(connection, funder, [ix]);
  }

  const balance = await connection.getTokenAccountBalance(agentAta).catch(() => null);
  const current = balance ? BigInt(balance.value.amount) : 0n;
  if (current >= minBaseUnits) return;

  const need = minBaseUnits - current;
  const { createTransferInstruction } = await import("@solana/spl-token");
  await sendTransactionHttp(connection, funder, [
    createTransferInstruction(funderAta, agentAta, funder.publicKey, need),
  ]);
}

export async function performX402HttpStep(args: {
  connection: Connection;
  /** Pays for ATA creation / USDC top-up when the agent wallet is short. */
  usdcFunder: Keypair;
  /** Signs the x402 exact payment. */
  payingAgent: Keypair;
  mint: PublicKey;
  endpoint: string;
  network: "devnet" | "localnet" | "mainnet";
  body?: string;
}): Promise<{ status: number; body: string }> {
  const { connection, usdcFunder, payingAgent, mint, endpoint, network } = args;

  if (x402IsMeteredUptoEndpoint(endpoint)) {
    throw new Error(
      "Seven-step submit cannot use playground upto (POST /summarize) after vault draw: " +
        "upto opens a wallet-funded channel, but draw already opened a pool-funded channel. " +
        "Use X402_ENDPOINT=http://127.0.0.1:3000/api/v1/fortune for integrated live x402, " +
        "or run npm run x402:smoke for standalone summarize.",
    );
  }

  await ensureAgentUsdcForExactX402(
    connection,
    usdcFunder,
    payingAgent.publicKey,
    mint,
    20_000n,
  );

  const { createKeyPairSignerFromBytes } = await import("@solana/kit");
  const signer = await createKeyPairSignerFromBytes(payingAgent.secretKey);
  const response = await fetchPaidEndpoint({
    endpoint,
    rpcUrl: connection.rpcEndpoint,
    network,
    signer,
    protocol: "x402",
  });
  if (response.status >= 200 && response.status < 300) {
    return { status: response.status, body: response.body };
  }

  if (response.status === 402) {
    throw new Error(
      `x402 payment failed (402). Fund devnet USDC: https://faucet.circle.com/ → agent ${payingAgent.publicKey.toBase58()}`,
    );
  }
  throw new Error(`x402 failed (${response.status}): ${response.body.slice(0, 300)}`);
}
