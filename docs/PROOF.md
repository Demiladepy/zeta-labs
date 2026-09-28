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

Run `npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail` and paste the **remove_delegate** explorer URL here after you run it (one-time proof; revoking is destructive for repeat spends on the same grant).

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
```

Honest non-claims: no production x402 merchant (demo uses `--skip-x402`). See `docs/STATUS.md`.
