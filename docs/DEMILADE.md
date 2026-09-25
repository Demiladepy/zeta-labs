# Demilade — Vault + Policy (what landed)

Day-1 host state machines are **real Solana programs** on Devnet
(`solana-program` 2.2, no Anchor). Frozen layouts untouched
(`INTERFACE_VERSION` = 1).

## What landed

- `programs/policy-registry` — `register_policy`, `evaluate`, `revoke` + packed `AuditRecord` via `sol_log_data`
- `programs/credit-vault` — `create_pool`, `deposit`, `open_line`, `draw`, `repay`
- **Program-side PDA provision** — `ensure_pda_account` + trailing `SystemProgram` (`docs/PDA.md`)
- `draw` order: evaluate → audit → (deny: no write) → reserve → encode Payment Channels `open` → optional CPI
- `crates/zeta-interface` — layouts, codecs, builders, pay-kit open encoding
- Host seven-step e2e + P1–P3 invariants

## Live Devnet IDs

| Program | ID |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |

See `docs/PROGRAM_IDS.md`.

## What is next (Demilade)

1. Keep STATUS honest as Anurag/Joshna ship.
2. Phase 2: P4 category ACL, P5 rolling/total caps when the team freezes the layout bump.
3. Optional: LiteSVM against current `.so`.

## Commands

```bash
# host tests
cargo test --workspace

# WSL BPF + upgrade (after code change)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd /mnt/c/Users/User/zeta-labs
cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
solana program deploy target/deploy/policy_registry.so \
  --program-id .keys/policy-registry-keypair.json \
  --url https://api.devnet.solana.com --with-compute-unit-price 10000
solana program deploy target/deploy/credit_vault.so \
  --program-id .keys/credit-vault-keypair.json \
  --url https://api.devnet.solana.com --with-compute-unit-price 10000
```
