# Demilade — Vault + Policy (what landed)

Day-1 host state machines are **real Solana programs** on Devnet
(`solana-program` 2.2, no Anchor). Layout freeze: `INTERFACE_VERSION` = **3**
(P4 ACL + P5 rolling/total caps).

## What landed

- `programs/policy-registry` — `register_policy`, `evaluate`, `revoke`, `set_acl`, `set_caps` + packed `AuditRecord` via `sol_log_data`
- `programs/credit-vault` — `create_pool`, `deposit`, `open_line`, `draw`, `repay`
- **P4 ACL** — sibling `["acl", policy]` PDA; category mask + up to 8 recipients; deny → `NotAllowlisted` with no line reserve
- **P5 caps** — `set_caps`; tumbling `LineUsage` (`["usage", line]`); total = `drawn + reserved + amount`; deny → `RollingCap` / `TotalCap` with no reserve
- **Audit hardening** — Clock sysvar key check; policy owner = Policy Registry on vault `open_line`/`draw`; repay requires `line.pool == pool`
- **Program-side PDA provision** — `ensure_pda_account` + trailing `SystemProgram` (`docs/PDA.md`)
- `draw` order: evaluate → audit → (deny: no write) → reserve → update usage → encode Payment Channels `open` → optional CPI
- `crates/zeta-interface` — layouts, codecs, builders, pay-kit open encoding
- Host seven-step e2e + P1–P5 invariants

## Live Devnet IDs

| Program | ID |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |

See `docs/PROGRAM_IDS.md`. Redeploy/upgrade after this bump before claiming v3 on-chain.

## What is next (Demilade)

1. Keep STATUS honest as Anurag/Joshna consume `INTERFACE_VERSION` = 3.
2. Optional: LiteSVM against current `.so`; Devnet upgrade of v3 BPF.

## Commands

```bash
# host tests
cargo test -p zeta-interface
cargo test -p policy-registry
cargo test -p credit-vault
cd packages/sdk && npm test
```
