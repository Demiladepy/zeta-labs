# Zeta dashboard

The dashboard is the read-only operations view for Zeta's lender, agent, and audit data. It automatically scans the deployed Zeta programs on Solana devnet and opens the most recently used connected pool, credit line, and policy.

## Run locally

```bash
cd packages/dashboard
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173). Live account discovery runs automatically.

Use **Connection settings** to:
- **Find live accounts** (auto-discovery)
- **Swig proof line** (Anurag Phase 2 devnet line from `docs/PROOF.md`)
- Paste pool / line / policy manually (`npm run devnet:swig-dashboard-config` in `packages/sdk` prints values)

Build the SDK first if the dashboard cannot resolve `@zetasdk/sdk`:

```bash
cd packages/sdk && npm run build
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Data rules

- The dashboard only reads chain state; it does not submit transactions.
- It matches account relationships from the shared layouts and prefers the credit line with the most recent transaction.
- Live accounts are checked against the expected Zeta program owners before decoding.
- Audit history is reconstructed from the latest 50 credit-line transactions.
- The dashboard imports the SDK's browser-safe `@zetasdk/sdk/dashboard` entry so account and audit decoding stays shared with the SDK.
