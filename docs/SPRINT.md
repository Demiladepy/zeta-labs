# Zeta Labs — Sprint (3 people)

**Window:** 23 Sep → 12 Oct 2026 (19 days).
**Team:** Demilade · Anurag · Joshna (SuperGirl).
**Principle:** full scope, safe order. The demoable path lands first.

Joshna absorbs what the 4-person plan called "person 3" (SDK) and
"person 4" (harness + dashboard). Demilade keeps the LiteSVM invariant
tests next to the programs so Joshna is not blocked on Rust.

---

## Roster

| Lane | Owner | Phase 1 (→ 29 Sep) | Phase 2 (→ 6 Oct) | Phase 3 (→ 12 Oct) |
| --- | --- | --- | --- | --- |
| Vault + Policy programs, P1–P3 tests | **Demilade** | programs + interface freeze + LiteSVM | full policy (P4–P5) + underwriting | hot-path harden (reentrancy, windowed-cap, compromised-key) |
| Payment Channels + x402 + pay-kit | **Anurag** | draw → meter → settle against real pay-kit | Swig delegated authority; Zcash go/no-go | real x402 endpoints in the demo |
| SDK + infra + dashboard | **Joshna** | SDK skeleton + faucet/RPC/deploy scripts + shared decoder | three-panel dashboard (audit first); SDK publish | demo polish, video capture, link-check |

---

## Phase 1 — Core credit path (Days 1–7, target 29 Sep)

**Goal:** lender deposits → agent gets a line → agent pays a real x402
endpoint on devnet → settlement → audit record.

### Day 1 (today) — interface freeze

Done in this repo: `crates/zeta-interface` + `packages/sdk/src/types.ts`
+ `docs/INTERFACE.md`. Nobody writes a second copy of account layouts
or `evaluate`.

### Build

- **Credit Vault v1:** `create_pool`, `deposit`, `open_line`, `draw`, `repay`.
- **Policy Registry v1:** `register_policy`, `evaluate`, `revoke`.
  Checks: per-call cap + expiry + revocation. Ordered. Emits audit.
- **pay-kit wiring (Anurag):** `draw` CPI-opens a Payment Channel.
  Meter off-chain. `settle_and_seal` + `distribute`. Then `repay`.
- **SDK (Joshna):** `createPool`, `openLine`, `spend`, `revoke`, `proof`.
- **P1–P3:** no overspend, no spend after expiry, revocation immediate.

### Demo path (seven steps)

1. Lender `createPool` + `deposit` (devnet USDC).
2. Lender `registerPolicy` (per-call cap, expiry).
3. Lender `openLine` for the agent.
4. Agent `spend` → on-chain `evaluate` **allow** → `draw` opens a channel.
5. Agent hits a real x402 `upto` endpoint; operator meters.
6. Operator `settle_and_seal` + `distribute`; vault `repay` books the actual.
7. Explorer links for the happy path + one **deny** + one **revoke**.

**Exit (Day 7):** those links exist. First Builder Feed post has a clip.

---

## Phase 2 — Full product + traction (Days 8–14, target 6 Oct)

- Policy: rolling + total caps, category/recipient allowlist (P4), full audit (P5).
- Underwriting v1: partial collateral + policy-tightness on `open_line`.
- Dashboard: lender / agent / audit, live from the **shared decoder**.
- SDK: typed denials, 10-line quickstart, faucet path, docs. Publish.
- Swig delegated authority (Anurag).
- Zcash: only if confidential repay is load-bearing. Else drop it.

**Traction (scored):** ≥2–3 World's Fair teams on `@zeta/sdk`. One
conversation with a real capital-holder / compute provider.

---

## Phase 3 — Harden, prove, submit (Days 15–19, target 12 Oct)

Harden the hot path. Real x402 endpoints. Pitch video (2–3 min, face
on camera, no AI voice). Private GitHub shared with Colosseum.
Accelerator supplement **written by hand**. Check every link.

---

## Standing rules

- One Builder Feed post every 24h.
- The fence: no fiat on-ramp, no merchant network, no human consumer app.
- Traction > features after Day 14.
- Interface-freeze discipline — see `docs/INTERFACE.md`.
