/**
 * HTTP x402 helpers for the seven-step path.
 *
 * Vault `draw` opens a pool-funded Payment Channel for credit + operator settle.
 * The HTTP x402 leg (exact or upto) is a separate pay-kit payment from the agent wallet.
 * Operator `settle_and_seal` on the vault channel uses `hasVoucher=false` (see spend-submit).
 */
import { PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS } from "../x402-merchant.js";
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

  const minUsdc = x402IsMeteredUptoEndpoint(endpoint)
    ? PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS
    : 20_000n;
  await ensureAgentUsdcForExactX402(connection, usdcFunder, payingAgent.publicKey, mint, minUsdc);

  const { createKeyPairSignerFromBytes } = await import("@solana/kit");
  const signer = await createKeyPairSignerFromBytes(payingAgent.secretKey);

  let response: { status: number; body: string };
  if (x402IsMeteredUptoEndpoint(endpoint)) {
    const payKitClient = await import("@solana/pay-kit/client");
    const client = await payKitClient.PayKitClient.builder()
      .signer(signer)
      .rpcUrl(connection.rpcEndpoint)
      .network(network)
      .permissions(false)
      .build();
    const httpRes = await client.fetch(
      endpoint,
      {
        method: "POST",
        body: args.body ?? "Zeta vault draw + metered x402 request.",
        headers: { "Content-Type": "text/plain" },
      },
      "x402",
    );
    response = { status: httpRes.status, body: await httpRes.text() };
  } else {
    response = await fetchPaidEndpoint({
      endpoint,
      rpcUrl: connection.rpcEndpoint,
      network,
      signer,
      protocol: "x402",
    });
  }
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
