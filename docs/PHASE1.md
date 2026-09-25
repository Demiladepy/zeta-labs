# Phase 1 snapshot — for planner / team sync (2026-09-25)

## One-liner

**Zeta Labs Phase 1 is real on Solana Devnet:** policy-bounded agent credit
with program-owned vault PDAs, on-chain evaluate/deny, and a seven-step spend
path wired through Payment Channels + SDK + dashboard.

## Who shipped what (since Day 1)

### Demilade (Vault + Policy)
- Frozen interface (`zeta-interface`)
- Policy Registry + Credit Vault programs
- PDA allocate path (`docs/PDA.md`)
- Devnet deploy + upgrade
- Host e2e / invariants

### Anurag (pay-kit / spend)
- Phase 1 pay-kit + x402 smoke
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

```powershell
cd C:\Users\User\zeta-labs\packages\dashboard
npm run dev
```

Program IDs: `docs/PROGRAM_IDS.md`  
PDA path: `docs/PDA.md`  
Honest claims: `docs/STATUS.md`

## Deadline note

Crypto World's Fair **final project submit = 12 Oct 2026 11:59pm PT**.
Today is Phase 1 / weekly sync — we already have a shippable spine; keep
building and do not over-claim Phase 2 features.
