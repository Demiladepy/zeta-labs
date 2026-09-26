# Devnet program IDs (share with Anurag)

**LIVE on Solana Devnet** — same IDs as `.keys/*.json` and `crates/zeta-interface/src/ids.rs`.
Upgraded **2026-09-26** with `INTERFACE_VERSION` = 3 + Underwriting v1 + **Phase 3 hot-path harden** (reentrancy lock, Channels id check).

| Program | Program ID | Explorer |
| --- | --- | --- |
| **Policy Registry** | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` | [view](https://explorer.solana.com/address/G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk?cluster=devnet) |
| **Credit Vault** | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` | [view](https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet) |
| Payment Channels (SF, already live) | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` | [view](https://explorer.solana.com/address/CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX?cluster=devnet) |
| Devnet USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | — |

**Anurag — paste these into Phase 1:**

```
POLICY_REGISTRY_PROGRAM_ID=G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk
CREDIT_VAULT_PROGRAM_ID=4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi
PAYMENT_CHANNELS_PROGRAM_ID=CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX
DEVNET_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

**Initial deploy tx signatures (2026-09-24):**
- Policy Registry: `3Y26WJsv3RGTPU5HSJH1DRzNWFCH4sY7QSvAfanv1CjSnkMmsL7t53YGv6JySQhfD1cKxmV95SqpzhsuBr5ufAuH`
- Credit Vault: `GTQZDUD2HNZKWhPt8DtELyoqazxSzSv8qGarMTvLPx5nPgUaNqDZLHoG1sQvBePu6FzrNjhaacsiE422t2TRNuL`

**Upgrade tx signatures (2026-09-26 — P4/P5 + Underwriting v1):**
- Policy Registry: `5ZQ3h6hmNRn9DTwA3xowfFifK4YnYxcgdxCfq9meyY13d5FJ2ZkpYfBTensorflowXYtWauvHJkvc2aKJcHbEFkYrgyevUK`
- Credit Vault: `25kC1qHLM3gGVesvund3F8b4h6Cjm3kUx4z2BAGXgwP9hz3Eqch6gQEDDmBk3c7wJgrDgFpsgKFYZxQeKjfQvJMb`

**Upgrade tx signatures (2026-09-26 — Phase 3 hot-path harden):**
- Policy Registry: `5LVWU7nYDWpcheTsHt4cxsRa9e6TSt17oxMpSyscUqjnSVCX7LD1c6jDcGjWTn2VqBcb925j5h2EHQtDnXFrbCsD`
- Credit Vault: `4XoxFG8vKPX1FpvohMDNid9vKGejmnfdwhKg85nBd9m4hwJhzVPAGgRrRifJuEbt54qS4Kcu8YUahaFH1Pr3bG6s`

**Status:** both programs upgraded + verified with `solana program show` on Devnet. Upgrade authority: `7QuNW1WLy58oYUfbXLboDMpyqzwfmKyYFU58q2bJ1uVX`. On-chain bytecode includes ACL, caps, open_line LTV underwriting (`UnderwritingDenied` = 6), and draw reentrancy lock (`Reentrancy` = 7). Fair txs: [`docs/PROOF.md`](./PROOF.md).

**PDA path for Anurag:** see [`docs/PDA.md`](./PDA.md) — seeds, spaces, account order (incl. Clock on `open_line`), program-side `create_account`.

Do **not** commit private keypair JSON (`.keys/` stays local/gitignored).
