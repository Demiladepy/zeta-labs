# Zeta Labs — Full Description

**Policy-bounded credit for Solana agents.**

A lender deposits USDC into a vault. An agent receives a credit line bound by an on-chain policy (per-call cap, expiry, instant revoke). Every spend is evaluated before anything moves. Settlement rides the real Payment Channels `open` → x402 `upto` path — the agent never holds unconstrained draw USDC.

---

## How we birthed

Zeta Labs started as a 19-day Colosseum Crypto World's Fair sprint (23 Sep → 12 Oct 2026). Day 1 we froze a shared contract (`zeta-interface`) so three lanes could ship in parallel: Demilade on Vault + Policy, Anurag on Payment Channels / x402 / pay-kit, Joshna on SDK + ops dashboard.

The spark was a gap Colosseum Copilot and the Fair surface kept naming: agents can already pay (Payment Channels, x402, agent wallets), but **credit** — spending capital they do not hold, under enforceable bounds — was missing. Pre-funded escrow and hot wallets exist; capped, expiring, revocable, *provable* draw authority did not. We built that layer.

---

## Why

Autonomous agents buy APIs, inference, and data on their own. Today that means either (1) a hot USDC wallet and hope, or (2) a human in every payment loop. Zeta is the third path: **credit with teeth**. Capital stays in a program-owned pool. The agent draws only what policy allows. Deny emits an audit and does **not** reserve. Revoke stops the next draw immediately.

Why now on Solana: Payment Channels + x402 `upto` already settle the spend leg. Zeta is the missing policy-bounded credit rail in front of them — not a fake merchant demo.

---

## For who

**Two-sided market.**

- **Demand:** operators whose agents buy compute, data, and APIs via x402 without pre-funding every call.
- **Supply:** capital-holders with idle USDC who will lend only under bounded, revocable, auditable policy — not blind trust.

We are not building a fiat on-ramp, merchant network, or human consumer wallet. Fence stays: agent credit rails only.

---

## Start to finish (what we do)

1. **Lender** `createPool` + `deposit` — Devnet USDC into a program-owned pool ATA.
2. **Lender** `registerPolicy` — per-call cap, expiry (revoke later anytime).
3. **Lender** `openLine` — bind agent + limit + policy.
4. **Agent** `spend` → on-chain `evaluate` (order: revoke → expiry → per-call cap). On allow: `draw` reserves the ceiling and CPI-opens a Payment Channel with the **vault PDA as payer** (not the agent wallet). On deny: audit only, no reserve.
5. Agent hits an x402 `upto` endpoint; operator meters off-chain vouchers up to the approved max.
6. Operator `settle_and_seal` + `distribute`; vault `repay` books actual settled and releases unused reservation.
7. Ops dashboard + explorer links show happy path, one deny, one revoke.

**Phase 1+ (live):** Policy Registry + Credit Vault on Devnet with P4 ACL, P5 caps, Underwriting v1, and hot-path harden; seven-step spend submit; Fair Explorer proof set (`docs/PROOF.md`); live dashboard. **Phase 2:** Swig delegated authority on devnet (`docs/PROOF.md` Swig section). Honest non-claims: **no production merchant x402** (playground / `--skip-x402` OK for demo).

---

## Positioning — Solana, Zcash, other bounties

**Solana (primary).** Colosseum Crypto World's Fair is the home track. Stack is native: custom Policy Registry + Credit Vault on Devnet; settlement via Solana Foundation Payment Channels + x402 `upto`. Traction goal: other Fair teams on `@zetasdk/sdk`; one real capital-holder / compute-provider conversation. Final Fair submit: **12 Oct 2026**.

**Zcash (conditional, not claimed).** Phase 2 go/no-go only if a confidential repay/settlement leg is load-bearing (e.g. spend metadata leaking lender strategy). Otherwise we drop it. Depth on Solana beats a shallow third chain.

**Other hackathons / bounties (honest).** Stocklana and similar forms get the same agent-credit demo for main-track presence. We do **not** claim PreStocks, Tessera, Clawpump, Meteora DBC, Pyth, or stock-token integrations we did not ship. Same rule everywhere: only claim what the Devnet spine proves.

---

## One-liner

Agents spend money they don't hold, because capital-holders can lend to them safely — every authority capped, expiring, revocable, and provable.
