# Honest status — what is real vs not

Do not claim anything in the "Not done" column in demos, Builder Feed, or the submission.

## Done (proven by `cargo test --workspace`)

| Piece | Evidence |
| --- | --- |
| Frozen layouts + `evaluate` order (revoke → expiry → per-call) | `zeta-interface`, INTERFACE_VERSION = 1 |
| P1–P3 host invariants | `crates/zeta-interface/tests/invariants.rs` |
| Policy Registry processor | register / evaluate / revoke + audit via `sol_log_data` |
| Credit Vault processor | create_pool / deposit / open_line / draw / repay |
| Deny does not reserve | processor tests |
| Payment Channels `open` encoding + 14 account metas | `encode_payment_channels_open` |
| Client ix builders (account order) | `zeta-interface::builders` + `packages/sdk/src/accountOrder.ts` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| BPF `.so` / `cargo build-sbf` | platform-tools incomplete on this Windows box |
| Devnet deploy + explorer links | needs `.so` + real program IDs |
| Live CPI into Payment Channels | needs deployed vault + channels accounts on a cluster |
| LiteSVM / Mollusk loading `.so` | blocked on BPF |
| P4 category allowlist / Token ACL | Phase 2 |
| P5 rolling + total caps | Phase 2 (audit emit exists; full P5 ACL/rolling does not) |
| Swig delegated authority | Phase 2 (Anurag) |
| SDK that submits txs | stubs only (`createPool` etc. throw) |
| Dashboard | Phase 2 (Joshna) |
| Formally verified LTL policy | roadmap only — enforced + tested, not proven |
| Real x402 endpoint demo | needs Anurag pay-kit + deploy |

## Next bit (Demilade)

1. Generate program keypairs when ready to deploy (still placeholders in `ids.rs`).
2. Build `.so` on a machine with a complete SBF SDK.
3. Then LiteSVM against that `.so`.
