# Phase 3 — Anurag (complete)

**Goal:** Live pay-kit x402 in the devnet demo (no `--skip-x402` only).

## Done

- Playground merchant on devnet (`scripts/start-paykit-playground.ps1`)
- `npm run x402:smoke` — standalone x402
- `npm run devnet:spend-submit -- --submit` — full path with **`POST /summarize`** or **`GET /fortune`**
- Explorer proof: `docs/PROOF.md` (Phase 3)
- `docs/X402.md`, `docs/STATUS.md`

## Commands

```bash
cd packages/sdk
npm run devnet:phase3-preflight
npm run check-devnet-usdc
npm run x402:smoke
npm run devnet:spend-submit -- --submit
```

Phase 1–2 regression:

```bash
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:swig-spend -- --submit --skip-x402
```
