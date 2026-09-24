# Devnet program IDs (share with Anurag)

**LIVE on Solana Devnet** (deployed 2026-09-24). Same as `.keys/*.json` and `crates/zeta-interface/src/ids.rs`.

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

**Deploy tx signatures:**
- Policy Registry: `3Y26WJsv3RGTPU5HSJH1DRzNWFCH4sY7QSvAfanv1CjSnkMmsL7t53YGv6JySQhfD1cKxmV95SqpzhsuBr5ufAuH`
- Credit Vault: `GTQZDUD2HNZKWhPt8DtELyoqazxSzSv8qGarMTvLPx5nPgUaNqDZLHoG1sQvBePu6FzrNjhaacsiE422t2TRNuL`

**Status:** both programs deployed + verified with `solana program show` on Devnet. Upgrade authority: `7QuNW1WLy58oYUfbXLboDMpyqzwfmKyYFU58q2bJ1uVX`.

**PDA path for Anurag:** see [`docs/PDA.md`](./PDA.md) — seeds, spaces, account order, program-side `create_account`. Devnet programs upgraded with this path (2026-09-24).

Do **not** commit private keypair JSON (`.keys/` stays local/gitignored).
