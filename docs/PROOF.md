# Fair proof set — Explorer paste sheet

Pinned **2026-09-26** after Phase 3 hot-path harden Devnet upgrade.
Cluster: **devnet**. Re-run the commands below if you need fresh txs for a recording.

## Programs

| Program | ID | Explorer |
| --- | --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` | [view](https://explorer.solana.com/address/G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk?cluster=devnet) |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` | [view](https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet) |

## Three txs (paste into Fair submit)

1. **Happy path — draw / open channel**  
   https://explorer.solana.com/tx/5Kn4tvShMYw7CrJFck8sycbJ1FQt8wxVZJKPEVKuiCzj2WFVwi647PXDgwndHw3x32unyJPB5cu4cehBUwEGKStG?cluster=devnet

2. **Deny — evaluate over per-call cap** (custom `0x67` / PerCallCap)  
   https://explorer.solana.com/tx/UZPKXpxLZiVaGVjk226Y2WJt2MkGL18ycctpBLPFDUqarHe1LSU1fYSLHYGtVMpacVukQXXPKXE39CKJWF6KhN8?cluster=devnet

3. **Revoke** (disposable policy seed 100)  
   https://explorer.solana.com/tx/43JmhcPN4LED2wM2LoPe6tkddyfjz2c79rVqbS8E9AY1VSXEZcD1UiFF2agjGSwMyTmfMEs2TqLQCNSud2UJEXjG?cluster=devnet

Related (optional):

- Allow evaluate: https://explorer.solana.com/tx/2oWSu3wVuGY1pMssdbQeAXD3tJ4rNUZGngzvnBKw5AfSmZcJWDLDH44x7VgBS8rJC4W4Z3G4qCTsTatEDEPxmR2S?cluster=devnet
- Post-revoke deny: https://explorer.solana.com/tx/4LGfANkiHsPBPDnCXNW81Gad4K2dgq1KN21bKsDcWcz4SyiUnGgpk6eYQtpoXhzRnM1gcf3WnwcCSUZtD5LCsSYa?cluster=devnet

## Accounts from this run

| Account | Pubkey |
| --- | --- |
| Pool | `G5nFWchW1GUJp85qS4YuLEtWo8dKh4NhmfXUcS9ByVZB` |
| Policy (live spend) | `AenFgEANwEDZSSQMuHzK5TB7gXge7TYpd1DJXhCgiyTQ` |
| Line | `AYP2yiFLn25QhHKv3hw4yS8xNLbcwKEVjDtabjQypsZ9` |
| Lender / agent | `9qPcrwU5BL7kXMYQzndg1J1BguK7mhx1AvqD6ACmFABd` |

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
