# Phase 2 — Anurag (complete)

Demilade’s program Phase 2 (P4/P5, underwriting, harden) is **done**. Anurag Phase 2 was **Swig delegated authority** — **complete in repo and on devnet** (`docs/PROOF.md`, `docs/STATUS.md`).

**Zcash:** dropped for this sprint.

## Milestones

| # | Deliverable | Status |
| --- | --- | --- |
| M1 | Swig SDK + program id | Done — `docs/SWIG.md` |
| M2 | `open_line(agent = Swig wallet)` | Done — on devnet |
| M3 | Delegate draw + repay (lender not in spend txs) | Done — explorer links in `PROOF.md` |
| M4 | Revoke delegate → spend fails | Script: `npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail` |
| M5 | STATUS + PROOF | Done |

## Commands

```powershell
cd packages\sdk
npm run devnet:swig-setup -- --submit
npm run devnet:swig-line-open -- --submit
npm run devnet:swig-spend -- --submit --skip-x402
npm run devnet:swig-revoke-delegate -- --submit --expect-spend-fail
npm run devnet:swig-dashboard-config
```

## Phase 3 (Anurag)

Production / Fair **x402 merchant** (replace `--skip-x402` in demo). See `docs/SPRINT.md`.
