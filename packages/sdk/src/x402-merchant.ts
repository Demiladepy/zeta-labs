/**
 * Pay-kit playground merchant limits (must match channel deposit / x402 `upto` ceiling).
 * @see https://github.com/solana-foundation/pay-kit — playground-api pricing
 */

export const DEFAULT_X402_ENDPOINT = "http://127.0.0.1:3000/api/v1/summarize";

/** POST /api/v1/summarize — usage(usd('0.1')) */
export const PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS = 100_000n;

/** GET /api/v1/fortune — fixed usd('0.01') */
export const PLAYGROUND_FORTUNE_CAP_BASE_UNITS = 10_000n;

/**
 * Channel deposit for draw must equal the x402 `maxAmount` on `upto` routes.
 */
export function x402DrawAmountBaseUnits(endpoint: string, skipX402: boolean): bigint {
  if (skipX402) return 1_000_000n;
  const url = endpoint.toLowerCase();
  if (url.includes("summarize")) return PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS;
  if (url.includes("fortune") || url.includes("quote")) return PLAYGROUND_FORTUNE_CAP_BASE_UNITS;
  return PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS;
}

export function x402SettledEstimate(drawAmount: bigint): bigint {
  return drawAmount / 4n > 0n ? drawAmount / 4n : 1n;
}

/** Playground `usage()` routes (POST summarize) — opens its own upto channel via PayKitClient. */
export function x402IsMeteredUptoEndpoint(endpoint: string): boolean {
  const url = endpoint.toLowerCase();
  return url.includes("summarize") || url.includes("/stream");
}
