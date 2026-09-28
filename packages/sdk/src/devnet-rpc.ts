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
import { asPolicyDeniedError } from "./errors.js";

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
    disableRetryOnRateLimit: false,
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
  const { blockhash, lastValidBlockHeight } = await retryOn429(
    () => connection.getLatestBlockhash("confirmed"),
  );
  const tx = new Transaction().add(...instructions);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer, ...extraSigners);
  let signature: string;
  try {
    signature = await retryOn429(() =>
      connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      }),
    );
  } catch (error) {
    throw asPolicyDeniedError(error) ?? error;
  }
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { value } = await retryOn429(() =>
      connection.getSignatureStatuses([signature]),
    );
    const status = value[0];
    if (status?.err) {
      const denied = asPolicyDeniedError(status.err, signature);
      if (denied) throw denied;
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return signature;
    }
    const height = await retryOn429(() =>
      connection.getBlockHeight("confirmed"),
    );
    if (height > lastValidBlockHeight) {
      throw new Error(`Transaction expired (block height exceeded): ${signature}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Confirmation timeout: ${signature}`);
}

export async function retryOn429<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("429") && attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s, 16s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("unreachable");
}
