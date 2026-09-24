# Zeta dashboard

The dashboard is the read-only operations view for Zeta's lender, agent, and audit data. It opens with clearly labelled sample data so the interface can be reviewed before the Solana programs are deployed.

## Run locally

```bash
cd packages/dashboard
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Connection settings** to enter a Solana devnet RPC URL and the deployed pool, credit-line, and policy account addresses.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Data rules

- The dashboard only reads chain state; it does not submit transactions.
- Live accounts are checked against the expected Zeta program owners before decoding.
- Audit history is reconstructed from the latest 50 credit-line transactions.
- The dashboard imports the SDK's browser-safe `@zeta/sdk/dashboard` entry so account and audit decoding stays shared with the SDK.
