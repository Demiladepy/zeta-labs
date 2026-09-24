# Deploy / faucet (Joshna)

Program IDs are frozen in the SDK; deploy keypairs remain local and uncommitted.

Target cluster: Solana devnet.
USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
Payment Channels: `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`.

Available now:

- `devnet.env` — RPC + faucet (not committed)
- `deploy-devnet.ps1` — deploys already-built program `.so` files after
  validating all four input paths and both program IDs.
- `packages/sdk` `npm run devnet:preflight` — read-only program deployment
  check using `scripts/devnet.env`.
- `packages/sdk` `npm run devnet:fund` — requests one devnet SOL for the agent
  and optionally funds sandbox USDC through `PLAYGROUND_FAUCET_URL`.

## Current deployment gate

Do not run the seven-step demo yet. In addition to the missing BPF artifacts,
the current v1 programs require a PDA account to exist before they initialise
it. A wallet cannot create that PDA account, so the program owners must add a
program-side allocation instruction/path under an agreed interface update.
