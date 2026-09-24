# @zeta/sdk

Developer toolkit for Zeta's policy-bounded Solana-agent credit flow.

## What it does today

- Decodes Pool, CreditLine, Policy, and on-chain AuditRecord bytes using the
  frozen Rust layout.
- Derives every Zeta PDA and builds Phase-1 pool, policy, line, deposit, revoke,
  draw, Payment Channels, settlement, and repay instructions.
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

## Important devnet prerequisite

The present v1 on-chain programs require pool, policy, and line PDA accounts
to already exist before their initialise instructions execute. A normal wallet
cannot create a PDA account by itself. `ZetaClient.createPool`,
`registerPolicy`, and `openLine` therefore require a `provision` callback until
the program owners add an approved program-side account-allocation path.

The SDK fails with `PdaAccountProvisioningRequiredError` instead of pretending
that it can complete an impossible transaction. This must be resolved before a
real devnet deployment and seven-step demo can run.

## Local checks

```powershell
npm ci
npm run typecheck
npm test
npm run paykit:smoke
```

For demo infrastructure, copy `scripts/devnet.env.example` to
`scripts/devnet.env`, then use `npm run devnet:fund` and
`npm run devnet:preflight` from this directory. The funding command requests
one devnet SOL and, when configured, calls the local pay-kit playground faucet
for sandbox USDC.
