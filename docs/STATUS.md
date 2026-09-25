# Honest status — what is real vs not

Do not claim anything in the "Not done" column in demos, Builder Feed, or the submission.

## Done (proven by `cargo test --workspace`)

| Piece | Evidence |
| --- | --- |
| Frozen layouts + `evaluate` order (revoke → expiry → per-call) | `zeta-interface`, INTERFACE_VERSION = 1 |
| P1–P3 host invariants | `crates/zeta-interface/tests/invariants.rs` |
| Policy Registry processor | register / evaluate / revoke + audit via `sol_log_data` |
| Credit Vault processor | create_pool / deposit / open_line / draw / repay |
| **PDA program-side provision** | `ensure_pda_account` on register / create_pool / open_line + trailing SystemProgram — `docs/PDA.md` |
| Deny does not reserve | processor tests |
| Payment Channels `open` encoding + 14 account metas | `encode_payment_channels_open` |
| Client ix builders (account order) | `zeta-interface::builders` + `packages/sdk/src/accountOrder.ts` |
| Shared TypeScript decoder + SDK builders | `decodePool` / `decodeLine` / `decodePolicy` / `decodeAudit` |
| SDK/devnet tooling foundation | typed client, proof decoding, funding/preflight scripts |
| Joshna dashboard | lender / agent / audit panels + automatic live-account discovery, verified against Devnet state |
| Program IDs live on Devnet | `docs/PROGRAM_IDS.md` |
| Seven-step processor e2e | `programs/credit-vault/tests/seven_step_e2e.rs` (host only) |
| Pack fixtures helper | `packages/sdk/src/decode.ts` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| LiteSVM / Mollusk loading `.so` | optional local sim |
| Live CPI into Payment Channels on explorer | needs Anurag remaining accounts + funded ATAs |
| P4 category allowlist / Token ACL | Phase 2 |
| P5 rolling + total caps | Phase 2 |
| Swig delegated authority | Phase 2 (Anurag) |
| Formally verified LTL policy | roadmap only |
| Real x402 endpoint demo | Anurag pay-kit |

## Next bit

1. Anurag: seven-step submit using `docs/PDA.md` (no client PDA create).
2. Demilade: upgrade Devnet `.so` after PDA allocate path lands.
3. LiteSVM against that `.so` when useful.
