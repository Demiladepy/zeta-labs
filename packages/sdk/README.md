# @zeta/sdk

Developer toolkit for Zeta's policy-bounded Solana-agent credit flow.

## What it does today

- Decodes Pool, CreditLine, Policy, and on-chain AuditRecord bytes using the
  frozen Rust layout.
- Derives every Zeta PDA and builds Phase-1 pool, policy, line, deposit, evaluate,
  revoke, draw, Payment Channels, settlement, and repay instructions.
- Plans the full seven-step spend path offline with `planSevenStepSpend` (no RPC).
- Fetches account state and decodes audit records from a transaction through
  `ZetaClient`.

## Quickstart

```ts
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createZetaClient } from "@zeta/sdk";

const payer = Keypair.fromSecretKey(/* local devnet keypair bytes */);
const zeta = createZetaClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  payer,
});

const pool = await zeta.pool(new PublicKey("POOL_ADDRESS"));
console.log(pool.deposited, pool.outstanding);

const receipt = await zeta.proof("TRANSACTION_SIGNATURE");
console.log(receipt.explorerUrl, receipt.audits);
```

## Devnet prerequisite

Pool, policy, and line PDAs are allocated **by the programs** on first init.
Instruction builders append `SystemProgram` automatically — see `docs/PDA.md`.
You do not need a client-side `provision` callback for Phase 1.

## Local checks

```powershell
npm ci
npm run typecheck
npm test
npm run paykit:smoke
npm run devnet:spend-plan
npm run devnet:spend-submit
npm run devnet:preflight
```

Submit on devnet:

```powershell
npm run devnet:preflight
npm run devnet:fund
npm run devnet:spend-submit -- --submit --skip-x402
npm run devnet:spend-submit -- --submit
npm run devnet:policy-demos -- --submit
```

Dry-run is the default for `devnet:spend-submit` (no `--submit` flag).
Use `--skip-x402` first to validate the on-chain path before starting the
local pay-kit playground for HTTP metering.

For demo infrastructure, copy `scripts/devnet.env.example` to
`scripts/devnet.env`, then use `npm run devnet:fund` and
`npm run devnet:preflight` from this directory. The funding command requests
one devnet SOL and, when configured, calls the local pay-kit playground faucet
for sandbox USDC.
