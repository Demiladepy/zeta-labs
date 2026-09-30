# Phase 3 — Anurag (live x402)

**Goal:** Fair demo runs a real pay-kit playground x402 leg — not `--skip-x402` only.

## Checklist

1. `scripts/devnet.env` — `NETWORK=devnet`, `OPERATOR_KEYPAIR_PATH`, `AGENT_KEYPAIR_PATH`.
2. **Integrated submit:** `X402_ENDPOINT=http://127.0.0.1:3000/api/v1/fortune` (not summarize — see `docs/X402.md`).
3. Fund **devnet USDC** on the agent/lender ([Circle faucet](https://faucet.circle.com/)).
4. `.\scripts\start-paykit-playground.ps1`
5. `npm run devnet:phase3-preflight --prefix packages/sdk`
6. `npm run devnet:spend-submit --prefix packages/sdk -- --submit`
7. Optional: `npm run x402:smoke` for standalone **upto** (`POST /summarize`).
8. Paste explorer URLs into `docs/PROOF.md` Phase 3 section.

## Commands

```bash
cd packages/sdk
npm run devnet:phase3-preflight
npm run check-devnet-usdc
npm run devnet:spend-submit -- --submit
npm run x402:smoke
```

Regression (on-chain only):

```bash
npm run devnet:spend-submit -- --submit --skip-x402
```

## Docs

- `docs/X402.md` — fortune vs summarize, amounts, playground setup
- `docs/STATUS.md` — Phase 3 row
