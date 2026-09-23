# Zeta Labs

Policy-bounded credit for Solana agents. A lender deposits USDC, an agent
gets a line, every spend is evaluated on-chain, and settlement happens
through the real Payment Channels / x402 `upto` path.

**Sprint:** 23 Sep → 12 Oct 2026 · Colosseum World's Fair
**Team:** Demilade · Anurag · Joshna (SuperGirl)

If nothing else ships, Phase 1 is the submission: one un-fakeable
devnet path with explorer links.

## Repo map

| Path | Owner | What |
| --- | --- | --- |
| `crates/zeta-interface` | **frozen Day 1 — all three** | Account layouts, `evaluate`, draw→channel mapping |
| `programs/credit-vault` | Demilade | `create_pool`, `deposit`, `open_line`, `draw`, `repay` |
| `programs/policy-registry` | Demilade | `register_policy`, `evaluate`, `revoke` |
| `packages/sdk` | Joshna | `createPool`, `openLine`, `spend`, `revoke`, `proof` |
| `docs/INTERFACE.md` | all | The merge-safety contract. Change only by agreement. |

## Standing rules

- One Builder Feed post every 24h.
- No naira/rupee on-ramp, no merchant network, no human consumer product.
- Shared types change only by agreement.
- Traction > features after Day 14.

See `docs/SPRINT.md` for the remapped 3-person plan.
