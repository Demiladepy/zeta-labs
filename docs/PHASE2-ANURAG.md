# Phase 2 — Anurag (Payment Channels + x402)

Demilade’s lane for Phase 2 (P4 ACL, P5 caps, underwriting v1, hot-path harden,
LiteSVM, Fair `PROOF.md`) is **done** — see `docs/STATUS.md`. Your Phase 2 focus
is **Swig delegated authority** for the lender→agent credit line grant. Phase 3
is production x402 merchants; keep using playground / `--skip-x402` until then.

## Zcash go/no-go

**Decision: drop for this sprint.** Confidential repay is not load-bearing for the
World’s Fair demo (policy caps + ACL + audit already bound spend). Revisit only if
a partner requires a shielded repay leg.

## What “Swig delegated authority” means here

Today (`resolve-spend-context.ts`):

- Lender (pool authority) runs `open_line` with `agent` = a raw ed25519 pubkey.
- `draw` requires that pubkey as **signer** (`programs/credit-vault/src/processor.rs`).

Target:

- `CreditLine.agent` = **Swig smart-wallet** pubkey (PDA).
- A **delegate** key (hot agent) signs the user-facing tx; Swig validates the
  delegate and CPIs `draw` with the wallet PDA as signer.
- Lender can rotate or revoke the delegate in Swig without re-opening the line.

No vault program change is required **if** Swig’s execute path presents the wallet
account as `agent` signer and `agent.key == line.agent` (same as today).

## Progress snapshot (~40% of Anurag Phase 2 in-repo)

**Done without Swig:** spend-authority types, env loader, `submitAgentSpend` authority
hook, `devnet:agent-spend` (raw spend-agent — lender not in spend txs), Swig
`wrap-draw` spec + execute stub, `docs/SWIG.md`, unit tests.

**Blocked:** M1–M5 below until Swig program id + SDK land (see `docs/SWIG.md`).

## Milestones

| # | Deliverable | Done when |
| --- | --- | --- |
| M1 | Pin Swig program id + TS/Rust SDK dep | Version locked in repo; devnet id in `docs/SWIG.md` |
| M2 | `open_line` with `agent = swigWallet` | Tx on devnet; dashboard shows line |
| M3 | `draw` via Swig delegate | Seven-step submit with delegate key only (lender not in draw tx) |
| M4 | Revoke delegate in Swig | New `draw` fails; lender line unchanged |
| M5 | `docs/STATUS.md` | Move “Swig delegated authority” to Done + explorer sig in `PROOF.md` |

## Repo touchpoints

- SDK spend path: `packages/sdk/src/spend-submit.ts`, `spend-plan.ts`
- Devnet wiring: `packages/sdk/scripts/resolve-spend-context.ts`
- Authority abstraction: `packages/sdk/src/spend-authority.ts`
- Swig helpers (WIP): `packages/sdk/src/swig/`
- Preflight: `npm run devnet:phase2-preflight` (from `packages/sdk`)

## Local env

`scripts/devnet.env` (from `devnet.env.example`):

- `AGENT_KEYPAIR_PATH` — lender / pool authority (`qoGVDF9j…` CLI wallet).
- `OPERATOR_KEYPAIR_PATH` — `.keys/operator.json` for settle.
- Phase 2 (when ready): `SWIG_WALLET_PUBKEY`, `SWIG_DELEGATE_KEYPAIR_PATH`.

## Spike (M1 — do first)

1. Confirm Swig artifact with the team (program id, npm/git SDK, devnet deploy).
2. Record in `docs/SWIG.md` (create on first pin).
3. Implement `createSwigWallet` + `addDelegateForCreditVaultDraw` in `packages/sdk/src/swig/`.
4. Add `devnet:swig-line-open` script (open line to Swig wallet, separate spend-agent file).

## Regression

Phase 1 path must keep working:

```powershell
cd packages\sdk
npm run devnet:preflight
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:policy-demos -- --submit
```

## Coordination

- **Demilade:** no interface bump expected for Swig; ping if draw account metas change.
- **Joshna:** dashboard should treat `line.agent` as opaque pubkey (Swig wallet ok).
- **Phase 3:** swap `X402_ENDPOINT` to a Fair merchant; remove `--skip-x402` in demo script.
