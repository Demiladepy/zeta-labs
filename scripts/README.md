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

Programs are on Devnet (see `docs/PROGRAM_IDS.md`). Init path:
`docs/PDA.md` — vault/policy allocate pool/policy/line PDAs via
`SystemProgram` CPI. Seven-step demo needs funded ATAs + Anurag channel accounts.
