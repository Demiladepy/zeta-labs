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

Deny / revoke:

```powershell
npm run devnet:policy-demos -- --submit
```

### 2. Explorer — use pinned Fair links in [`docs/PROOF.md`](./PROOF.md)

Do not invent txs. After a fresh submit, replace PROOF.md with the new explorer URLs.

Programs:

- Policy: https://explorer.solana.com/address/G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk?cluster=devnet
- Vault: https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet

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

### 5. Pyth cut (AAPL equity vs tokenized)

```bat
cd /d C:\Users\User\zeta-labs\packages\sdk
npm run pyth:aapl-compare
```

Show ALLOW / TIGHTEN / HALT, then cut to spend-submit. See docs/PYTH.md.
