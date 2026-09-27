# Swig integration (Phase 2 — blocked on contributor input)

Zeta does **not** need a vault program change if Swig’s execute path signs as
`CreditLine.agent`. All client-side wiring lives under `packages/sdk/src/swig/`.

## Blocked — need from Swig / team owner

| Item | Who | Why |
| --- | --- | --- |
| Devnet **Swig program id** | Swig or integrator | `assertSwigReady`, execute txs |
| **TS or Rust SDK** (npm/git pin) | Swig | `createSwigWallet`, delegate ACL, execute wrapper |
| Confirmed **execute** account layout for CPI to credit-vault `draw` | Swig + Anurag | `buildSwigExecuteDrawTransaction` |
| One **Fair explorer** sig: open_line(agent=swig) + delegate draw | Anurag after M1 | `docs/PROOF.md` + `STATUS.md` |

Until the first row is in this file, milestones **M1–M5** in `docs/PHASE2-ANURAG.md` cannot close.

## Env (after M1)

In `scripts/devnet.env`:

```env
SWIG_WALLET_PUBKEY=<swig wallet PDA base58>
SWIG_DELEGATE_KEYPAIR_PATH=C:\Projects\zeta-labs\.keys\spend-agent.json
```

## Code map (ready vs stub)

| File | Status |
| --- | --- |
| `packages/sdk/src/spend-authority.ts` | Done — raw vs Swig delegate model |
| `packages/sdk/src/swig/wrap-draw.ts` | Done — inner draw spec; execute tx **stub** |
| `packages/sdk/src/swig/index.ts` | Stub — wallet create / ready check |
| `packages/sdk/scripts/spend-authority-env.ts` | Done — env → `SpendAuthority` |
| `packages/sdk/scripts/devnet-agent-spend.ts` | Done — lender **not** in spend txs (raw agent) |
| `packages/sdk/scripts/devnet-phase2-preflight.ts` | Done — local checklist |

## Demilade / Joshna

- **Demilade:** no action unless draw account metas change (unlikely).
- **Joshna:** dashboard already treats `line.agent` as opaque pubkey; Swig wallet is fine.
