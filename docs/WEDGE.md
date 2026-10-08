# The wedge — what Zeta is, in one claim

**Per-call caps are theatre. Zeta enforces the sequence.**

An agent with a 1 USDC per-call cap can drain 20 USDC in twenty legal calls.
Every request passes. The sequence was never checked. Zeta bounds what a
*sequence* can spend, on-chain, before funds move.

---

## The problem is named in the literature

"SoK: Blockchain Agent-to-Agent Payments" (arXiv:2604.03733, 2026) surveys
deployed agent-payment systems and names this as open:

> "Authorization policies constrain individual transactions (e.g., amount,
> recipient, rules). However, they **do not capture the execution history,
> cumulative spend, or multi-step strategies**. Therefore, sequences of valid
> transactions may violate intended spending boundaries through **repetition,
> fragmentation, or timing manipulation**."

The same SoK covers authorization and spend control thoroughly and says nothing
about extending *credit* to agents that hold no capital. Both halves of Zeta sit
in that gap.

## What we enforce, and the exact bound

`LineUsage` is a tumbling-window accumulator read by `evaluate` before any draw.
The guarantees, each with a test:

| Claim | Bound | Test |
| --- | --- | --- |
| A per-call cap alone does not bound a sequence | unbounded — 100x ceiling drained | `per_call_cap_alone_does_not_bound_a_fragmented_drain` |
| No decomposition beats the window cap | `admitted <= rolling_cap` | `fragmentation_cannot_exceed_rolling_cap_within_one_window` |
| Timing a burst across a window boundary | `admitted <= 2 x rolling_cap` | `tumbling_window_boundary_burst_is_bounded_by_two_caps` |
| Sustained manipulation over W windows | `admitted <= W x rolling_cap` | `timing_manipulation_is_bounded_by_windows_elapsed` |
| Lifetime ceiling survives window resets | `admitted <= total_cap` | `total_cap_bounds_the_sequence_even_when_the_window_resets` |

Rust: `crates/zeta-interface/tests/invariants.rs::fragmentation` — the sweep
case replays every legal chunk size against the real `evaluate` body.
TypeScript mirror: `packages/sdk/test/fragmentation.test.ts`.

**We state the limit too.** A tumbling window is not a sliding window. An
attacker who times a burst at the end of one window and again at the start of
the next admits at most `2 x rolling_cap` across that boundary. That is a
precise, tested bound, not a gap we are hiding. A sliding window would close it
at the cost of per-draw storage; that trade is on the roadmap, not in this
build.

## Show it in 30 seconds

```bash
cd packages/sdk

# The industry default: per-call cap only. The drain succeeds.
npm run demo:fragmentation -- --undefended

# Zeta: same attack, same per-call cap, accumulator on. Stopped at the ceiling.
npm run demo:fragmentation
```

Read-only — no keypairs, no transactions. Safe to run on camera.

Against a real deployed policy:

```bash
npm run demo:fragmentation -- --policy <POLICY_PUBKEY>
```

For on-chain denials in the dashboard audit panel, use the tested submit path:

```bash
npm run devnet:policy-demos -- --submit
```

## In the SDK

`simulateSpendSequence` lets a caller test a whole spend plan offline before
sending anything:

```ts
import { simulateSpendSequence, buildFragmentationAttack } from "@zetasdk/sdk";

const attempts = buildFragmentationAttack({
  perCallCap: 1_000_000n,   // 1.00 USDC
  target: 20_000_000n,      // what a compromised agent would try
  startAt: BigInt(Math.floor(Date.now() / 1000)),
});

const { admitted, deniedCount } = simulateSpendSequence(policyLimits, attempts);
// admitted is bounded by rollingCap, however the attacker fragments
```

This is the mirror of the frozen on-chain body. If `evaluate.rs` changes, this
changes with it — see `docs/INTERFACE.md`.

## Why this is not the project that already placed

Mercantill (Cypherpunk 2025, 4th Place Stablecoins) built policy-based spending
safeguards and audit trails for AI agents on Squads Grid. Real work, adjacent
framing. Its controls are **per-transaction**. Zeta's are **per-sequence**, in
custom on-chain programs, with the bound stated and tested.

"Spending controls for agents" is the most crowded category in the Colosseum
corpus — 325 projects, the largest single cluster. "The only policy engine that
survives fragmentation" is a claim no one else in that cluster is making.

## What we still do not claim

See `docs/STATUS.md`. Formal LTL verification is roadmap. The hosted production
merchant is roadmap; the Fair demo runs the local pay-kit playground on devnet.
