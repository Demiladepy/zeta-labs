# Honest status — what is real vs not

Do not claim anything in the "Not done" column in demos, Builder Feed, or the submission.

## Done

| Piece | Owner | Evidence |
| --- | --- | --- |
| Frozen layouts + `evaluate` order | Demilade | `zeta-interface`, `INTERFACE_VERSION` = 3 |
| PolicyAcl + `set_acl` + evaluate P4 | Demilade | `NotAllowlisted` (106); ACL allow/deny host tests |
| `set_caps` + LineUsage + evaluate P5 | Demilade | `RollingCap` (104) / `TotalCap` (105); host e2e |
| Underwriting v1 on `open_line` | Demilade | LTV from policy tightness; custom error `6`; host + LiteSVM |
| Hot-path reentrancy lock | Demilade | `Pool._pad[0]` around Channels CPI; custom `7`; Payment Channels id check |
| Windowed-cap edge tests | Demilade | boundary / overflow / mid-window `set_caps` in `invariants.rs` |
| LiteSVM BPF harness | Demilade | `programs/litesvm-harness` — load `.so`, underwriting allow/deny |
| Policy Registry + Credit Vault on Devnet | Demilade | `docs/PROGRAM_IDS.md` — upgraded 2026-09-26 (harden pass) |
| Fair Explorer proof set | Demilade | `docs/PROOF.md` — happy draw + deny + revoke |
| PDA program-side provision | Demilade | `docs/PDA.md` — trailing SystemProgram on init ixs |
| Deny does not reserve | Demilade | processor + seven-step host e2e (+ ACL/caps/underwriting deny) |
| Payment Channels `open` encoding | Demilade + Anurag | `encode_payment_channels_open` + pay-kit wire |
| Seven-step **devnet spend submit** | Anurag | `npm run devnet:spend-submit -- --submit` (+ `--skip-x402`) |
| Policy deny / revoke demos | Anurag | `npm run devnet:policy-demos -- --submit` |
| SDK `spend()` / `submitAgentSpend` | Anurag | `packages/sdk/src/index.ts`, `spend-submit.ts` |
| Dashboard live Devnet panels | Joshna | `packages/dashboard` — auto-discovers pool/line/policy |
| **Fragmentation resistance (sequence bound)** | Demilade | `invariants.rs::fragmentation` (5 claims incl. 2x-boundary limit); TS mirror `fragmentation.test.ts`; `npm run demo:fragmentation` — see `docs/WEDGE.md` |
| Shared TS decoder | team | `decodePool` / `decodeLine` / `decodePolicy` / `decodePolicyAcl` / `decodeLineUsage` / `decodeAudit` |
| **SDK on npm (`@zetasdk/sdk`)** | Joshna | `npm install @zetasdk/sdk` · final name · `docs/SDK-PUBLISH.md` |
| Swig delegated authority | Anurag | `npm run devnet:swig-setup`, `swig-line-open`, `swig-spend` on devnet (`docs/PROOF.md`) |
| Live x402 (pay-kit playground) | Anurag | `x402:smoke`; `devnet:spend-submit -- --submit` (`/summarize` + `/fortune`); `docs/PHASE3-ANURAG.md` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| Formally verified LTL policy | roadmap |
| Hosted production merchant (non-playground) | Fair demo uses local pay-kit playground on devnet |

## Verdict

Phase 1 spine + P4 + P5 + Underwriting v1 + hot-path harden + LiteSVM + Fair PROOF.md are in-repo. Hackathon final submit is **12 Oct 2026**.
