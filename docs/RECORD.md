# RECORD.md — technical video (localhost)
# Paste these while recording. Do NOT tour a Demo-data dashboard.

## Pitch (60s)
Voice + logo / docs/assets/architecture.svg — no UI click-tour.

## Technical (~90–120s)

### 1. Terminal — spend path

```powershell
cd C:\Users\User\zeta-labs\packages\sdk
npm run devnet:preflight
npm run devnet:spend-submit -- --submit --skip-x402
```

Optional deny/revoke:

```powershell
npm run devnet:policy-demos -- --submit
```

### 2. Explorer — use **your** tx links from the latest submit output (cluster=devnet)

Example from a verified Sept 25 run (re-run for fresh txs when recording):

- draw_open_channel: https://explorer.solana.com/tx/2U6pFNYVz1z4vRKxLhSJutXhgCo8YmgUAEV1KSpKjNWBfSt8Jn7Q4b4oDU9KHmdgd2su8M5sTLHTJfxd3SL6yS6m?cluster=devnet
- evaluate: https://explorer.solana.com/tx/5LffA55muC8dXWCXfZ8RP5srm6httCJJHYS878RXLJEt6CpTgBTbKKmKLgWYr4CDMCceBFLSYBj7fqA22JhAufw4?cluster=devnet

Programs:

- Policy: https://explorer.solana.com/address/G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk?cluster=devnet
- Vault: https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet

Pinned accounts from that run (paste into dashboard Connection if discovery fails):

- Pool: `G5nFWchW1GUJp85qS4YuLEtWo8dKh4NhmfXUcS9ByVZB`
- Policy: `AenFgEANwEDZSSQMuHzK5TB7gXge7TYpd1DJXhCgiyTQ`
- Line: `AYP2yiFLn25QhHKv3hw4yS8xNLbcwKEVjDtabjQypsZ9`

### 3. Dashboard only if Live (not Demo)

```powershell
cd C:\Users\User\zeta-labs\packages\dashboard
npm run dev
# http://localhost:4173/
```

Live host: https://zetalabsx.vercel.app

### 4. ClawPump cut (after MCP agent exists)

Open agent dashboard URL from `get_dashboard_urls`, then cut back to spend-submit + Explorer.
See docs/CLAWPUMP.md.
