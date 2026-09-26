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

## Reproduce

```powershell
cd C:\Users\User\zeta-labs\packages\sdk
npm run devnet:fund
# Circle faucet → Solana Devnet → paste lender pubkey (≥10 USDC)
# Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
npm run devnet:preflight
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:policy-demos -- --submit
```

Honest non-claims: no Swig, no production x402 merchant (demo uses `--skip-x402`). See `docs/STATUS.md`.
