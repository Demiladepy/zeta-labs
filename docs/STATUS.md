# Honest status — what is real vs not

Do not claim anything in the "Not done" column in demos, Builder Feed, or the submission.

## Done (Phase 1 spine + P4 + P5)

| Piece | Owner | Evidence |
| --- | --- | --- |
| Frozen layouts + `evaluate` order | Demilade | `zeta-interface`, `INTERFACE_VERSION` = 3 |
| PolicyAcl + `set_acl` + evaluate P4 | Demilade | `NotAllowlisted` (106); ACL allow/deny host tests |
| `set_caps` + LineUsage + evaluate P5 | Demilade | `RollingCap` (104) / `TotalCap` (105); host e2e |
| Policy Registry + Credit Vault on Devnet | Demilade | `docs/PROGRAM_IDS.md` — programs live + PDA allocate path |
| PDA program-side provision | Demilade | `docs/PDA.md` — trailing SystemProgram on init ixs |
| Deny does not reserve | Demilade | processor + seven-step host e2e (+ ACL/caps deny) |
| Payment Channels `open` encoding | Demilade + Anurag | `encode_payment_channels_open` + pay-kit wire |
| Seven-step **devnet spend submit** | Anurag | `npm run devnet:spend-submit -- --submit` (+ `--skip-x402`) |
| Policy deny / revoke demos | Anurag | `npm run devnet:policy-demos -- --submit` |
| SDK `spend()` / `submitAgentSpend` | Anurag | `packages/sdk/src/index.ts`, `spend-submit.ts` |
| Dashboard live Devnet panels | Joshna | `packages/dashboard` — auto-discovers pool/line/policy |
| Shared TS decoder | team | `decodePool` / `decodeLine` / `decodePolicy` / `decodePolicyAcl` / `decodeLineUsage` / `decodeAudit` |

## Not done (do not claim)

| Piece | Why |
| --- | --- |
| LiteSVM / Mollusk `.so` harness | optional |
| Swig delegated authority | Phase 2 |
| Formally verified LTL policy | roadmap |
| Production x402 merchant endpoint | demo uses playground / `--skip-x402` path |
| Devnet upgrade of v3 BPF (if still on older `.so`) | upgrade after host tests green |

## Phase 1 verdict (2026-09-25)

**We have a real Phase 1.** Vault + Policy are deployed; Anurag can submit the seven-step spend path on Devnet; Joshna’s dashboard reads live accounts. **P4 ACL + P5 caps landed in-repo** (`INTERFACE_VERSION` = 3). Next: polish demo video — hackathon final submit is **12 Oct 2026**.
