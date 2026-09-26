# Demilade — Vault + Policy (what landed)

Day-1 host state machines are **real Solana programs** on Devnet
(`solana-program` 2.2, no Anchor). Layout freeze: `INTERFACE_VERSION` = **3**
(P4 ACL + P5 rolling/total caps). Underwriting v1 (LTV on `open_line`) does **not** bump the interface.

## What landed

- `programs/policy-registry` — `register_policy`, `evaluate`, `revoke`, `set_acl`, `set_caps` + packed `AuditRecord` via `sol_log_data`
- `programs/credit-vault` — `create_pool`, `deposit`, `open_line` (Underwriting v1), `draw`, `repay`
- **P4 ACL** — sibling `["acl", policy]` PDA; category mask + up to 8 recipients; deny → `NotAllowlisted` with no line reserve
- **P5 caps** — `set_caps`; tumbling `LineUsage` (`["usage", line]`); total = `drawn + reserved + amount`; deny → `RollingCap` / `TotalCap` with no reserve
- **Underwriting v1** — tightness LTV (bps) on `open_line`; Clock required; deny → `UnderwritingDenied` (custom `6`); no new accounts / no INTERFACE bump
- **LiteSVM harness** — `programs/litesvm-harness` loads both `.so` files; allow + deny underwriting path
- **Audit hardening** — Clock sysvar key check; policy owner = Policy Registry on vault `open_line`/`draw`; repay requires `line.pool == pool`
- **Hot-path harden** — `Pool._pad[0]` reentrancy lock around Payment Channels CPI (custom `7`); Channels program-id check; rolling/total overflow → deny; window boundary tests
- **Revoke story** — revoke kills new spend immediately; in-flight `reserved` clears only via `repay` (no clawback)
- **Program-side PDA provision** — `ensure_pda_account` + trailing `SystemProgram` (`docs/PDA.md`)
- `draw` order: evaluate → audit → (deny: no write) → reserve → update usage → encode Payment Channels `open` → optional CPI
- `crates/zeta-interface` — layouts, codecs, builders, pay-kit open encoding
- Host seven-step e2e + P1–P5 + underwriting invariants

## Live Devnet IDs

| Program | ID |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |

See `docs/PROGRAM_IDS.md` (upgraded 2026-09-26 — harden pass). Fair txs: `docs/PROOF.md`.

## What is next (Demilade)

1. Keep STATUS / PROOF honest through Fair submit (12 Oct 2026).
2. Do not claim Swig or production x402 until STATUS moves them to Done.

## Commands

```bash
# host tests
cargo test -p zeta-interface
cargo test -p policy-registry
cargo test -p credit-vault
cd packages/sdk && npm test

# BPF + LiteSVM (WSL / Linux with cargo-build-sbf)
cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
cargo test -p litesvm-harness -- --nocapture

# Devnet upgrade (same program IDs; requires .keys/)
solana program deploy target/deploy/policy_registry.so --program-id .keys/policy-registry-keypair.json
solana program deploy target/deploy/credit_vault.so --program-id .keys/credit-vault-keypair.json
```
