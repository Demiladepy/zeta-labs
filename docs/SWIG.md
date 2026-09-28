# Swig integration (Phase 2)

Swig smart-wallet delegation for `CreditLine.agent`. Vault program unchanged.

## Pinned artifacts (M1)

| Item | Value |
| --- | --- |
| npm | `@swig-wallet/classic@2.1.0`, `@swig-wallet/lib@2.1.0` |
| Program id (devnet/mainnet) | `swigypWHEksbC64pWKwah1WTeh9JXwx8H1rJHLdbQMB` |
| State file (gitignored) | `.keys/swig-line-grant.json` |

Docs: https://build.onswig.com/reference/typescript

## On-chain flow

1. **Setup** — lender creates Swig; delegate (`spend-agent`) gets `programLimit` on Credit Vault + Payment Channels.
2. **open_line** — `agent` = **Swig wallet** address (`getSwigWalletAddress`), not the Swig account PDA.
3. **draw / repay** — inner vault ixs wrapped with `getSignInstructions` (delegate signs).

## Commands

```powershell
cd packages\sdk
npm run devnet:swig-setup -- --submit
npm run devnet:swig-line-open -- --submit
npm run devnet:swig-spend -- --submit --skip-x402
npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail
npm run devnet:swig-dashboard-config
```

Dashboard UI: **Connection settings → Swig proof line** (or paste output of `devnet:swig-dashboard-config`).

Requires funded lender + `OPERATOR_KEYPAIR_PATH`.

**RPC:** use `RPC_URL=https://api.devnet.solana.com` or `HELIUS_API_KEY` in `scripts/devnet.env`.
Do **not** use Tatum’s public gateway for submits (5 req/min → 429). The SDK auto-rewrites Tatum to Solana Labs.

## Env (optional override)

```env
SWIG_WALLET_PUBKEY=<from swig-line-grant.json>
SWIG_DELEGATE_KEYPAIR_PATH=C:\Projects\zeta-labs\.keys\spend-agent.json
```

If `swig-line-grant.json` exists, `resolveSpendAuthority` picks Swig mode automatically.

## Remaining for M5

- Explorer signatures in `docs/PROOF.md`
- Move row to Done in `docs/STATUS.md` after you run the three commands successfully on devnet
