# Demilade — Vault + Policy (what landed)

Day-1 host state machines are now **real Solana programs** (`solana-program` 2.2, no Anchor CLI). Frozen layouts are untouched (`INTERFACE_VERSION` stays 1).

## What landed

- `programs/policy-registry` — entrypoint + processors for `register_policy`, `evaluate`, `revoke`. Always emits a packed `AuditRecord` via `sol_log_data`. Deny = `ProgramError::Custom(100 + Denial)`.
- `programs/credit-vault` — entrypoint + processors for `create_pool`, `deposit`, `open_line`, `draw`, `repay`.
- `draw` order is fixed: **evaluate → audit → (deny: no write) → reserve → encode Payment Channels `open`**. Return data is the exact `open` ix bytes. CPI `invoke_signed` (pool PDA seeds) runs only when the Payment Channels program + 14 `open` accounts are passed.
- `crates/zeta-interface` — pack/unpack, instruction codecs, `encode_payment_channels_open` + 14-account metas. Host P1–P3 tests still pass.
- Processor tests (AccountInfo, no LiteSVM yet): no overspend, no spend after expiry, revoke immediate, deny does not reserve, Pool/Policy/Line/Audit byte roundtrip.

Account metas: `docs/INTERFACE.md` (no version bump).

## What is next

1. **LiteSVM / Mollusk** — load the `.so` and CPI the real Payment Channels program. Host+processor tests cover the state machine; they do not execute BPF or a live `open`.
2. **`cargo build-sbf` on this Windows box** — `solana-cli` reports platform-tools v1.52, but the SBF rust lib is missing (`...\platform-tools\rust\lib` is not a directory). Reinstall fails with OS 1314 (privilege). Programs are entrypoint-shaped (`cdylib` + `solana-program`); build the `.so` on a machine with a complete `cargo-build-sbf --skip-tools-install` SDK, or reinstall platform-tools as admin.
3. **Deploy keypairs** — placeholders in `ids.rs` (`POLICY_REGISTRY_ID` / `CREDIT_VAULT_ID`) are not deployable. `solana-keygen new` two program keypairs, put pubkeys in `ids.rs` + Joshna’s deploy scripts, then `cargo build-sbf` + `solana program deploy`.
4. **Client alloc** — create/register/open_line expect pre-sized, zeroed PDA accounts. Joshna: `createAccount` for `POOL_LEN` / `POLICY_LEN` / `CREDIT_LINE_LEN`.
5. **Anurag** — attach remaining accounts + distribution extra to `draw`; vault already encodes disc/header/metas. Confirm live program PDA still includes `open_slot` (pay-kit docs.rs `find_channel_pda` is one salt short of the freeze). Token `deposit` CPI is optional (accounts 2–4).
6. **P4–P5** — rolling/total caps + ACL; fields already reserved as zeros.

## Commands

```
cargo test --workspace
cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
```
