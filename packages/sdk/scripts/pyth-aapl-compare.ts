/**
 * Pyth AAPL basis compare — Equity vs xStock vs Ondo via Hermes (API key required).
 *
 * Post Aug 2026 Pyth Core upgrade, Hermes price updates need:
 *   Authorization: Bearer $PYTH_API_KEY
 * Get a key: https://insights.pyth.network/ (Pyth Terminal) → API keys
 *
 *   copy scripts\pyth.env.example scripts\pyth.env
 *   npm run pyth:aapl-compare --prefix packages/sdk
 *
 * Functional use: off-chain Zeta credit signal from live market basis.
 * Does not touch on-chain programs.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_HERMES = "https://hermes.pyth.network";
const UPGRADED_HERMES = "https://pyth.dourolabs.app/hermes";

/** Feed IDs from Hermes `price_feeds?query=AAPL`. */
export const PYTH_AAPL_FEEDS = [
  {
    key: "equity",
    symbol: "Equity.US.AAPL/USD",
    label: "Apple equity (regular)",
    id: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  },
  {
    key: "xstock",
    symbol: "Crypto.AAPLX/USD",
    label: "Apple xStock",
    id: "978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675",
  },
  {
    key: "ondo",
    symbol: "Crypto.AAPLON/USD",
    label: "Apple Ondo tokenized",
    id: "e6734de88a83d9d2fb33072adab319004700aefd069653aba30ba9e3cac056f2",
  },
] as const;

type FeedKey = (typeof PYTH_AAPL_FEEDS)[number]["key"];

type ParsedPrice = {
  key: FeedKey;
  symbol: string;
  label: string;
  id: string;
  price: number;
  conf: number;
  expo: number;
  publishTime: number;
};

type HermesLatest = {
  parsed?: Array<{
    id: string;
    price: { price: string; conf: string; expo: number; publish_time: number };
  }>;
};

export type CreditSignal = "ALLOW" | "TIGHTEN" | "HALT";

const DEFAULT_TIGHTEN_BPS = 50;
const DEFAULT_HALT_BPS = 150;

function flagValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

function loadPythKey(): string {
  const fromEnv = process.env.PYTH_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const envPath = resolve(import.meta.dirname, "../../../scripts/pyth.env");
  if (!existsSync(envPath)) {
    throw new Error(
      [
        "Missing PYTH_API_KEY.",
        "Hermes price updates require a Pyth API key (post Aug 2026 Core upgrade).",
        "1) Create a key at https://insights.pyth.network/ (Pyth Terminal)",
        "2) copy scripts\\pyth.env.example → scripts\\pyth.env",
        "3) set PYTH_API_KEY=...",
      ].join("\n"),
    );
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() === "PYTH_API_KEY") {
      const value = trimmed.slice(eq + 1).trim();
      if (value) return value;
    }
  }
  throw new Error(`PYTH_API_KEY not set in ${envPath}`);
}

function toFloat(price: string, expo: number): number {
  return Number(price) * 10 ** expo;
}

function bps(a: number, b: number): number {
  if (b === 0) return Number.POSITIVE_INFINITY;
  return ((a - b) / b) * 10_000;
}

function decideSignal(
  equity: number,
  others: number[],
  tightenBps: number,
  haltBps: number,
): { signal: CreditSignal; maxAbsBps: number; worst: string } {
  let maxAbs = 0;
  let worst = "n/a";
  for (let i = 0; i < others.length; i++) {
    const abs = Math.abs(bps(others[i]!, equity));
    if (abs > maxAbs) {
      maxAbs = abs;
      worst = i === 0 ? "xStock vs equity" : "Ondo vs equity";
    }
  }
  if (maxAbs >= haltBps) return { signal: "HALT", maxAbsBps: maxAbs, worst };
  if (maxAbs >= tightenBps) return { signal: "TIGHTEN", maxAbsBps: maxAbs, worst };
  return { signal: "ALLOW", maxAbsBps: maxAbs, worst };
}

async function fetchLatest(apiKey: string, hermesBase: string): Promise<ParsedPrice[]> {
  const params = new URLSearchParams();
  for (const feed of PYTH_AAPL_FEEDS) params.append("ids[]", feed.id);
  const url = `${hermesBase.replace(/\/$/, "")}/v2/updates/price/latest?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Hermes ${res.status} (${hermesBase}): ${(await res.text()).slice(0, 400)}`);
  }
  const body = (await res.json()) as HermesLatest;
  const byId = new Map(
    (body.parsed ?? []).map((p) => [p.id.replace(/^0x/, "").toLowerCase(), p]),
  );

  return PYTH_AAPL_FEEDS.map((feed) => {
    const row = byId.get(feed.id.toLowerCase());
    if (!row) throw new Error(`Missing Hermes price for ${feed.symbol}`);
    return {
      key: feed.key,
      symbol: feed.symbol,
      label: feed.label,
      id: feed.id,
      price: toFloat(row.price.price, row.price.expo),
      conf: toFloat(row.price.conf, row.price.expo),
      expo: row.price.expo,
      publishTime: row.price.publish_time,
    };
  });
}

async function main() {
  const tightenBps = Number(flagValue("--tighten-bps") ?? DEFAULT_TIGHTEN_BPS);
  const haltBps = Number(flagValue("--halt-bps") ?? DEFAULT_HALT_BPS);
  const hermesBase = flagValue("--hermes") ?? process.env.PYTH_HERMES_URL ?? DEFAULT_HERMES;
  const apiKey = loadPythKey();

  console.log("=== Zeta × Pyth AAPL basis (Hermes) ===");
  console.log("Feeds: Equity.US.AAPL/USD · Crypto.AAPLX/USD · Crypto.AAPLON/USD");
  console.log(`Hermes: ${hermesBase}`);
  console.log(`Thresholds: tighten≥${tightenBps}bps halt≥${haltBps}bps vs equity\n`);

  let prices: ParsedPrice[];
  try {
    prices = await fetchLatest(apiKey, hermesBase);
  } catch (first) {
    if (hermesBase === DEFAULT_HERMES) {
      console.warn(String(first));
      console.warn(`Retrying upgraded Hermes: ${UPGRADED_HERMES}`);
      prices = await fetchLatest(apiKey, UPGRADED_HERMES);
    } else {
      throw first;
    }
  }

  const equity = prices.find((p) => p.key === "equity")!;
  const xstock = prices.find((p) => p.key === "xstock")!;
  const ondo = prices.find((p) => p.key === "ondo")!;

  for (const p of prices) {
    const ageSec = Math.max(0, Math.floor(Date.now() / 1000) - p.publishTime);
    console.log(`${p.symbol}`);
    console.log(`  ${p.label}`);
    console.log(`  price=$${p.price.toFixed(4)}  conf=±$${p.conf.toFixed(4)}  age=${ageSec}s`);
    console.log(`  id=${p.id}`);
  }

  console.log("\nBasis vs Equity.US.AAPL/USD:");
  console.log(`  AAPLX−equity: ${bps(xstock.price, equity.price).toFixed(1)} bps`);
  console.log(`  AAPLON−equity: ${bps(ondo.price, equity.price).toFixed(1)} bps`);

  const { signal, maxAbsBps, worst } = decideSignal(
    equity.price,
    [xstock.price, ondo.price],
    tightenBps,
    haltBps,
  );

  console.log("\n=== Zeta credit signal (off-chain policy input) ===");
  console.log(`signal: ${signal}`);
  console.log(`max |basis|: ${maxAbsBps.toFixed(1)} bps (${worst})`);
  if (signal === "ALLOW") {
    console.log("→ Agent credit draws OK under current Pyth equity↔tokenized basis.");
  } else if (signal === "TIGHTEN") {
    console.log("→ Recommend lower per-call cap / shorter expiry before draw.");
  } else {
    console.log("→ Recommend pause agent draws until basis normalizes (or revoke).");
  }
  console.log("\nOK — Pyth AAPL compare finished.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
