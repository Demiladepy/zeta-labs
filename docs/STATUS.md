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
| Shared TypeScript decoder + SDK builders | `decodePool` / `decodeLine` / `decodePolicy` / `decodeAudit`; frozen account order covered by tests |
| SDK/devnet tooling foundation | typed client, proof decoding, funding/preflight scripts, ID-checked deploy script |
| Joshna dashboard foundation | lender / agent / audit panels, shared SDK decoder, demo fallback, live devnet connection settings |
| Program keypairs (local, undeployed) | `.keys/*.json` → pubkeys in `ids.rs` |
| Colosseum Copilot local config | `scripts/colosseum.env` (gitignored), skill installed |
| Seven-step processor e2e | `programs/credit-vault/tests/seven_step_e2e.rs` (host only) |
| Pack fixtures helper | `packages/sdk/src/decode.ts` (`packPool` / `packPolicy`) — reads use Anurag `decoder.ts` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| BPF `.so` / `cargo build-sbf` | platform-tools incomplete on this Windows box |
| Devnet deploy + explorer links | needs `.so` |
| Live CPI into Payment Channels | needs deployed vault + channels accounts |
| LiteSVM / Mollusk loading `.so` | blocked on BPF |
| P4 category allowlist / Token ACL | Phase 2 |
| P5 rolling + total caps | Phase 2 (audit emit exists; full P5 ACL/rolling does not) |
| Swig delegated authority | Phase 2 (Anurag) |
| End-to-end SDK transaction path | builders/client landed; live initialization is blocked because v1 programs do not allocate their PDA accounts |
| Dashboard populated with live devnet accounts | UI and read path are complete; programs and account addresses are not deployed yet |
| Formally verified LTL policy | roadmap only — enforced + tested, not proven |
| Real x402 endpoint demo | needs Anurag pay-kit + deploy |

## Next bit (Demilade)

1. Build `.so` on a machine with a complete SBF SDK (keypairs already generated).
2. Then LiteSVM against that `.so`.
3. Anurag: wire `build_draw_with_channel_open` remaining accounts.