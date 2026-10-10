# Fair proof set — Explorer paste sheet

Pinned **2026-10-10** — policy deny/revoke refreshed for live dashboard (`npm run devnet:policy-demos -- --submit`).
Cluster: **devnet**. Re-run the commands below if you need fresh txs for a recording.

## Programs

| Program | ID | Explorer |
| --- | --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` | [view](https://explorer.solana.com/address/G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk?cluster=devnet) |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` | [view](https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet) |

## Three txs (paste into Fair submit)

1. **Happy path — draw / open channel** (same pool as dashboard)  
   https://explorer.solana.com/tx/2NkAUKyxBNqF7X7TkWvoGT9W1Jjex7TpEWHK6pk3DHMN5FRdw6QpfhSauJKGmAJaEj3o7ZTAJkfVFLMt3MVGofTs?cluster=devnet

2. **Deny — evaluate over per-call cap** (custom `0x67` / PerCallCap)  
   https://explorer.solana.com/tx/VrNXHZykRmGR9bRPU3ma5yW395GniLhrXXs16nFURffSAapCyVkxV6vzacQhwSPUfRsKHz69ZvwP1vHkqFDrYJf?cluster=devnet

3. **Revoke** (disposable policy seed 100)  
   https://explorer.solana.com/tx/3XLuS6VG7pQgL8yrqAoRXU3DPosD6qFudbZptc5ra2UeEaXWjcQAV8nZHLTqyELoWjgmVE3w38cGJiXFuS8Qz3k6?cluster=devnet

Related (optional):

- Allow evaluate: https://explorer.solana.com/tx/xL5XQr38XZYj4yGvgPn5QkdD5xU5GHMmZiAMHGEYsubyTB4jTU8d5SvrhTiHfuow58Rwm3qzWGnRRWqykegHkvj?cluster=devnet
- Post-revoke deny: https://explorer.solana.com/tx/4KzvP8kPpsSMHDz6Rec6TK6tVD3ZTKiTrs4EVZacpXZnZH6vq6a5ismYRMtSCGFnfAsrRXQJ1brydeQxq2YwDKtJ?cluster=devnet

## Accounts (live demo / dashboard)

| Account | Pubkey |
| --- | --- |
| Pool | `4tPUrLPZpsBv2J6YnkdAthQGbXNG7moiNCHVCKFKcz2j` |
| Policy (live spend, seed 2) | `A1MJPKPKnAraJY4gSp6cM1yRiEnWSfAH2zLJHjaKJgX7` |
| Line (spend-agent) | `79EwonAo43CgfDWYFWudNJ2tEFjEycwBULvf5TVF6g4x` |
| Lender | `qoGVDF9jB2xoCDmuSfVYBYgGoLyNVpDtxqzK8zkR1eZ` |
| Agent (spend-agent) | `FumddriDZBEisrSq9fNNUDYySmB6yZV5aTWBvaio7uyH` |
| Operator | `HfPBHCqZqcitttF7L2w9dRUTLTTa8TT93kY4N6QL2xCM` |

Legacy Phase 1 pool (older proof txs): `G5nFWchW1GUJp85qS4YuLEtWo8dKh4NhmfXUcS9ByVZB`.

## Phase 2 — Swig Delegated Authority (On-Chain Proof Set)

Pinned **2026-09-28** after Swig smart wallet delegation e2e on Devnet.
Cluster: **devnet**.

### Accounts
| Account | Pubkey |
| --- | --- |
| Swig Smart Wallet (line.agent) | `6cGd2NAc2Ce1PXj7XurfwHKF7GXhiFH9HWvxpNkBB7nU` |
| Delegate (spend-agent hot key) | `FumddriDZBEisrSq9fNNUDYySmB6yZV5aTWBvaio7uyH` |
| Credit Line | `9nc1MRMEoxKs9GQvTtk72xDa4zqzpCX9qTknBj1RdjpF` |
| Lender / Authority | `qoGVDF9jB2xoCDmuSfVYBYgGoLyNVpDtxqzK8zkR1eZ` |
| Pool | `4tPUrLPZpsBv2J6YnkdAthQGbXNG7moiNCHVCKFKcz2j` |

### Live Transactions (Lender absent from spend txs)
1. **evaluate** (agent preflight)  
   https://explorer.solana.com/tx/31W3GDLMyCjUvQGFbpZ841gHtNQdwdVDyWnqKbtX6in4ugP7yWdSBtPh9r7nSucGt3keBKDiLsxUNW4evTpXrSjX?cluster=devnet
2. **draw_open_channel** (Swig Sign CPI → Credit Vault draw → Payment Channels open)  
   https://explorer.solana.com/tx/4LRv3B8WZ27QYY7afJtQL8fF7kYWS7ax3rMNVektTJXWKz3bSwxU8C9GgrxxusoeC6RamUopdhx287AjPLFRhtGw?cluster=devnet
3. **settle_and_seal** (operator settle)  
   https://explorer.solana.com/tx/RHhgVzURneHf92YSHG8m2nBcbeEnFhx2p1ezYCfr8Z6xtFBirP2SafA5kxBNYU76VpAXG3puT4zsviUU73o78zE?cluster=devnet
4. **distribute** (channel distribution)  
   https://explorer.solana.com/tx/HSA7JSP4UbWoYZjYT7QhhzocCrCYdL3ShQ6bPHk61sDUvDFdgW35hJfxnpAc3KsSAVcfjdJLkqpC4ADAD3SZ7kX?cluster=devnet
5. **repay** (Swig Sign CPI → Credit Vault repay)  
   https://explorer.solana.com/tx/yAevYUyGJU2eZshRBp2hdXSRTTAfAtNnEMaCqP5UfLQvgr4XWTdJmyNMxQWyP94LaNtcyEwAK4vfAoU4vUmxFPZ?cluster=devnet

### M4 — revoke delegate (lender removes spend-agent from Swig)

Pinned **2026-09-28**. After this tx, delegate spend correctly fails (`Role not found for ID: 1`).

1. **remove_delegate** (lender revokes spend-agent Swig role)  
   https://explorer.solana.com/tx/3xnfNJqPWmhw6DN5tVJWtDdEio1QdfXv4zxj7cSUwm8EsgJTR5d7TzoLqb2ojhTkXwh6vXHkbjnH9WjLAMBrZUBo?cluster=devnet

2. **Follow-up spend attempt** (expected failure — proof only, no separate explorer tx required)  
   `npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail`

This is a **one-time demo proof**. You do **not** need to run setup again unless you want to **re-demo** a full Swig spend on devnet.

## Reproduce

```powershell
cd packages\sdk
npm run devnet:fund
npm run devnet:preflight
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:policy-demos -- --submit

# Phase 2 Swig:
npm run devnet:swig-setup -- --submit
npm run devnet:swig-line-open -- --submit
npm run devnet:swig-spend -- --submit --skip-x402
npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail
npm run devnet:swig-dashboard-config

# Phase 3 — live x402 (pay-kit playground, devnet):
.\scripts\start-paykit-playground.ps1
npm run devnet:phase3-preflight
npm run x402:smoke
npm run devnet:spend-submit -- --submit
```

## Phase 3 — live x402 (pay-kit playground, devnet)

Pinned **2026-09-30**. Playground: `http://127.0.0.1:3000` (`NETWORK=devnet`).

### Standalone x402 smoke
- **upto / summarize:** `POST /api/v1/summarize` — HTTP 200, billed metered usage (agent wallet pays).
- **exact / fortune:** `GET /api/v1/fortune` — HTTP 200 (see integrated run below).

### Integrated seven-step + live x402 (`POST /summarize`, no `--skip-x402`) — canonical Anurag path

| Step | Explorer / result |
| --- | --- |
| evaluate | https://explorer.solana.com/tx/xL5XQr38XZYj4yGvgPn5QkdD5xU5GHMmZiAMHGEYsubyTB4jTU8d5SvrhTiHfuow58Rwm3qzWGnRRWqykegHkvj?cluster=devnet |
| draw_open_channel | https://explorer.solana.com/tx/2NkAUKyxBNqF7X7TkWvoGT9W1Jjex7TpEWHK6pk3DHMN5FRdw6QpfhSauJKGmAJaEj3o7ZTAJkfVFLMt3MVGofTs?cluster=devnet |
| x402_upto | HTTP 200 — `{"billedBaseUnits":"800","summarizedBytes":34,"tokens":"8"}` |
| settle_and_seal | https://explorer.solana.com/tx/4tSf9mXBV1vSQsVC78YeiQ7QgsLxus9nKbhwKj8yCGjGggVmeM1PyaK8GYreDaR1e6HbAg3154mU3UU39LHKgDe4?cluster=devnet |
| distribute | https://explorer.solana.com/tx/2LeiGcNxZBFSd4LAeBsM9Pq674a6qEvyVpUpZxfgpcru97H1qd5nfhr9zaJF2YW9bhLiNR2VCkfpaWaXN71zXAaC?cluster=devnet |
| repay | https://explorer.solana.com/tx/2rByKcP8XcrbUiaBc4EVgrf4gdMJXkS2UfT5ADvgn2uReqhKkuFNZVvXEhJnGi2nEdv8RENpjbWQi78hzcxWmLmG?cluster=devnet |

Also verified: `GET /fortune` integrated run (exact x402) in same Phase 3 session.

Accounts: pool `4tPUrLPZpsBv2J6YnkdAthQGbXNG7moiNCHVCKFKcz2j`, spend-agent `FumddriDZBEisrSq9fNNUDYySmB6yZV5aTWBvaio7uyH`, lender `qoGVDF9jB2xoCDmuSfVYBYgGoLyNVpDtxqzK8zkR1eZ`.

See `docs/X402.md`.

Honest non-claims: no separately hosted production merchant (playground is local). See `docs/STATUS.md`.
