/**
 * x402 `upto` client helpers.
 *
 * Standalone endpoints: use PayKitClient (agent wallet pays directly).
 * Vault-integrated spend: call `planVaultDrawOpen` first, then coordinate
 * with the operator — channel deposit must equal x402 `maxAmount`.
 */

export type X402FetchParams = {
  endpoint: string;
  /** Optional protocol force: 'x402' | 'mpp'. */
  protocol?: "x402" | "mpp";
};

export type X402FetchResult = {
  status: number;
  body: string;
  headers: Record<string, string>;
};

/**
 * Pay a live x402 / pay-kit `upto` endpoint using the agent wallet.
 * Requires `@solana/pay-kit/client` and a configured signer at runtime.
 *
 * This is the Phase 1 standalone path (no vault). Vault CPI wiring uses
 * `planVaultDrawOpen` + operator settle instead.
 */
export async function fetchPaidEndpoint(
  params: X402FetchParams & {
    rpcUrl: string;
    network: "devnet" | "mainnet" | "localnet";
    signer: unknown;
  },
): Promise<X402FetchResult> {
  const payKitClient = await import("@solana/pay-kit/client");

  const client = await payKitClient.PayKitClient.builder()
    .signer(params.signer as never)
    .rpcUrl(params.rpcUrl)
    .network(params.network)
    // Smoke / agent scripts: unrestricted so sandbox + devnet challenges work.
    .permissions(false)
    .build();

  const response = await client.fetch(
    params.endpoint,
    { method: "GET" },
    params.protocol,
  );

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    body: await response.text(),
    headers,
  };
}
