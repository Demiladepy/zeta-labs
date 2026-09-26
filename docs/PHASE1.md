# Phase 1 snapshot — for planner / team sync (2026-09-26)

## One-liner

**Zeta Labs is real on Solana Devnet:** policy-bounded agent credit with
program-owned vault PDAs, on-chain evaluate/deny/revoke, P4 ACL + P5 caps,
Underwriting v1, hot-path harden, and a seven-step spend path through Payment
Channels + SDK + dashboard. Fair Explorer links live in `docs/PROOF.md`.

## Who shipped what

### Demilade (Vault + Policy)
- Frozen interface (`zeta-interface`, `INTERFACE_VERSION` = 3)
- Policy Registry + Credit Vault (P4/P5, underwriting, reentrancy lock)
- PDA allocate path (`docs/PDA.md`)
- Devnet deploy + upgrades (`docs/PROGRAM_IDS.md`)
- Host e2e / invariants + LiteSVM harness
- Fair proof set (`docs/PROOF.md`)

### Anurag (pay-kit / spend)
- Phase 1 pay-kit + x402 smoke (playground / `--skip-x402` — not production merchant)
- Complete devnet spend submit (`submitAgentSpend` / `spend()`)
- Repeat-run harden + policy deny/revoke demo scripts
- Agent rotation after revoke

### Joshna (SDK surface / dashboard)
- Live dashboard: auto-discovers pool / line / policy on Devnet
- Expanded credit operations UI
- Shared decoder consumption

## Pasteable proof commands

```powershell
cd C:\Users\User\zeta-labs\packages\sdk
npm run devnet:preflight
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:policy-demos -- --submit
```

Pinned explorer txs: `docs/PROOF.md`  
Program IDs: `docs/PROGRAM_IDS.md`  
PDA path: `docs/PDA.md`  
Honest claims: `docs/STATUS.md`

```powershell
cd C:\Users\User\zeta-labs\packages\dashboard
npm run dev
```

## Deadline note

Crypto World's Fair **final project submit = 12 Oct 2026 11:59pm PT**.
Do not claim Swig or production x402 until they land in STATUS Done.
