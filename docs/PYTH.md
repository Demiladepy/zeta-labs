# Pyth wedge — best use of market data (World’s Fair–safe)

Honest claim: Zeta Labs uses **live Pyth Hermes prices** to compare Apple **equity**
vs **tokenized** listings and emit an **off-chain credit signal** before agent draws.

We do **not** claim an on-chain Pyth oracle CPI in the vault (programs frozen for Fair).

## Feeds (hackathon brief)

| Role | Symbol | Hermes feed id |
| --- | --- | --- |
| Regular Apple equity | `Equity.US.AAPL/USD` | `49f6b65c…55688` |
| xStock | `Crypto.AAPLX/USD` | `978e6cc6…58675` |
| Ondo | `Crypto.AAPLON/USD` | `e6734de8…056f2` |

## What we built

```text
Hermes latest prices
  → equity vs AAPLX vs AAPLON basis (bps)
  → ALLOW / TIGHTEN / HALT credit signal
  → operator uses signal before Zeta spend-submit
```

Script: [`packages/sdk/scripts/pyth-aapl-compare.ts`](../packages/sdk/scripts/pyth-aapl-compare.ts)

## Commands (CMD — one line at a time)

```bat
cd /d C:\Users\User\zeta-labs\packages\sdk
```

```bat
npm run pyth:aapl-compare
```

Optional thresholds:

```bat
npm run pyth:aapl-compare -- --tighten-bps 50 --halt-bps 150
```

## How this fits Zeta

Zeta is policy-bounded agent credit. Tokenized equities can diverge from the
cash equity print. A large basis is a **risk signal** for credit: tighten caps or
halt draws — same spirit as on-chain revoke/expiry, using Pyth for the market leg.

Technical video beat: run `pyth:aapl-compare` → show ALLOW/TIGHTEN/HALT → cut to
`devnet:spend-submit` Explorer txs.

## Form

See [`docs/PYTH-SUBMIT.md`](./PYTH-SUBMIT.md).
