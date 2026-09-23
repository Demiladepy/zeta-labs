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

1. **Instruction builders** — done (`zeta-interface::builders` + Joshna `accountOrder.ts`).
2. **Honest status** — see `docs/STATUS.md`. Do not claim deploy / LiteSVM / P4–P5 / formal verify.
3. **`cargo build-sbf`** — still blocked on this Windows box (platform-tools). Build `.so` elsewhere.
4. **Deploy keypairs** — placeholders in `ids.rs`. Generate when BPF works.
5. **LiteSVM** — after `.so` exists.
6. **Anurag** — attach 14 `open` accounts + distribution extra via `build_draw_with_channel_open`.
7. **P4–P5** — Phase 2.

## Commands

```
cargo test --workspace
cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
```
