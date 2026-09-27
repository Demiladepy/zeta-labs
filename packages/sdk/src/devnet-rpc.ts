/**
 * HTTP-only Solana RPC helpers (avoid websocket 429 spam on public gateways).
 */
import {
  Connection,
  type ConnectionConfig,
  type Keypair,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";

const RPC_TIMEOUT_MS = 90_000;
const CONFIRM_TIMEOUT_MS = 120_000;

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type ConnectionInternals = Connection & {
  _rpcWebSocket?: { close: () => void; connect?: () => void };
};

function disableWebSocketSubscriptions(connection: Connection): void {
  const ws = (connection as ConnectionInternals)._rpcWebSocket;
  if (!ws) return;
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  if (typeof ws.connect === "function") {
    ws.connect = () => {};
  }
}

export function createHttpConnection(
  rpcUrl: string,
  commitment: ConnectionConfig["commitment"] = "confirmed",
): Connection {
  const connection = new Connection(rpcUrl, {
    commitment,
    fetch: fetchWithTimeout,
    disableRetryOnRateLimit: true,
    confirmTransactionInitialTimeout: CONFIRM_TIMEOUT_MS,
  });
  disableWebSocketSubscriptions(connection);
  return connection;
}

export async function sendTransactionHttp(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[],
  extraSigners: Keypair[] = [],
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(...instructions);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer, ...extraSigners);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return signature;
    }
    const height = await connection.getBlockHeight("confirmed");
    if (height > lastValidBlockHeight) {
      throw new Error(`Transaction expired (block height exceeded): ${signature}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Confirmation timeout: ${signature}`);
}
