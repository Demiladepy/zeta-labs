# LiteSVM harness

Loads the Policy Registry and Credit Vault BPF `.so` files into LiteSVM and exercises Underwriting v1 on `open_line` (deny over-LTV, allow at LTV max).

## Prerequisite

Build both programs first (WSL / Linux with `cargo-build-sbf`):

```bash
cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
```

`.so` files must land in `target/deploy/policy_registry.so` and `target/deploy/credit_vault.so`.

## Run

```bash
cargo test -p litesvm-harness -- --nocapture
```

Host AccountInfo tests in `programs/credit-vault` stay; this crate proves the **deployed bytecode** matches underwriting policy.
