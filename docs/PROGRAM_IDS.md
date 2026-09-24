# Devnet program IDs (share with Anurag)

Frozen IDs — same as `.keys/*.json` and `crates/zeta-interface/src/ids.rs`.

| Program | Program ID |
| --- | --- |
| **Policy Registry** | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| **Credit Vault** | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |
| Payment Channels (SF, already live) | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |
| Devnet USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

**Anurag — paste these into Phase 1:**

```
POLICY_REGISTRY_PROGRAM_ID=G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk
CREDIT_VAULT_PROGRAM_ID=4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi
```

**Status (2026-09-24):**
- BPF `.so` built in WSL: `target/deploy/policy_registry.so`, `target/deploy/credit_vault.so`
- Pubkeys frozen; deploy uses `.keys/*-keypair.json` (gitignored), **not** auto keypairs under `target/deploy/`
- Live Devnet deploy pending SOL on wallet `7QuNW1WLy58oYUfbXLboDMpyqzwfmKyYFU58q2bJ1uVX` (CLI airdrop rate-limited — fund via https://faucet.solana.com)

Do **not** commit private keypair JSON.
