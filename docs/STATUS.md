# Honest status — what is real vs not

Do not claim anything in the "Not done" column in demos, Builder Feed, or the submission.

## Done (Phase 1 spine)

| Piece | Owner | Evidence |
| --- | --- | --- |
| Frozen layouts + `evaluate` order | Demilade | `zeta-interface`, INTERFACE_VERSION = 1 |
| Policy Registry + Credit Vault on Devnet | Demilade | `docs/PROGRAM_IDS.md` — programs live + PDA allocate path |
| PDA program-side provision | Demilade | `docs/PDA.md` — trailing SystemProgram on init ixs |
| Deny does not reserve | Demilade | processor + seven-step host e2e |
| Payment Channels `open` encoding | Demilade + Anurag | `encode_payment_channels_open` + pay-kit wire |
| Seven-step **devnet spend submit** | Anurag | `npm run devnet:spend-submit -- --submit` (+ `--skip-x402`) |
| Policy deny / revoke demos | Anurag | `npm run devnet:policy-demos -- --submit` |
| SDK `spend()` / `submitAgentSpend` | Anurag | `packages/sdk/src/index.ts`, `spend-submit.ts` |
| Dashboard live Devnet panels | Joshna | `packages/dashboard` — auto-discovers pool/line/policy |
| Shared TS decoder | team | `decodePool` / `decodeLine` / `decodePolicy` / `decodeAudit` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| LiteSVM / Mollusk `.so` harness | optional |
| P4 category allowlist / Token ACL | Phase 2 |
| P5 rolling + total caps | Phase 2 |
| Swig delegated authority | Phase 2 |
| Formally verified LTL policy | roadmap |
| Production x402 merchant endpoint | demo uses playground / `--skip-x402` path |

## Phase 1 verdict (2026-09-25)

**We have a real Phase 1.** Vault + Policy are deployed; Anurag can submit the seven-step spend path on Devnet; Joshna’s dashboard reads live accounts. Next: polish demo video + keep shipping Phase 2 — hackathon final submit is **12 Oct 2026**, not today.
