# @zetasdk/sdk

Developer toolkit for Zeta's policy-bounded Solana-agent credit flow.

## Install

```bash
npm install @zetasdk/sdk @solana/web3.js
```

Registry: [npmjs.com/package/@zetasdk/sdk](https://www.npmjs.com/package/@zetasdk/sdk) (npm org **`zetasdk`**).

Peer: Node 20+ and a Solana RPC (Devnet for the shipped program IDs below).

### Package exports

| Import | Use |
| --- | --- |
| `@zetasdk/sdk` | Decoders, instruction builders, `createZetaClient`, `spend`, Swig helpers, pay-kit re-exports |
| `@zetasdk/sdk/types` | Frozen layouts and program IDs only |
| `@zetasdk/sdk/paykit` | Payment Channels + x402 helpers |
| `@zetasdk/sdk/dashboard` | Shared dashboard decode helpers |

Devnet scripts (`devnet:spend-submit`, Swig setup, etc.) live in the
[GitHub repo](https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk) — not in the npm tarball.

## Devnet program IDs

These constants are exported from `@zetasdk/sdk` (`POLICY_REGISTRY_PROGRAM_ID`, etc.):

| Program | ID |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |
| Payment Channels | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |
| Devnet USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

Full deploy notes: [`docs/PROGRAM_IDS.md`](https://github.com/Demiladepy/zeta-labs/blob/main/docs/PROGRAM_IDS.md).

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
import { createZetaClient } from "@zetasdk/sdk";
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ZETA_KEY!)));
const zeta = createZetaClient({ connection: new Connection("https://api.devnet.solana.com"), payer });
const pool = await zeta.pool(new PublicKey(process.env.ZETA_POOL!));
const proof = await zeta.proof(process.env.ZETA_SIGNATURE!);
console.log({ deposited: pool.deposited, outstanding: pool.outstanding });
console.log(proof.explorerUrl, proof.allowed);
```

The snippet is read-only. Set `ZETA_KEY`, `ZETA_POOL`, and `ZETA_SIGNATURE` to
your Devnet values. Transaction methods use the same configured client.

Policy rejections are typed, so callers can handle a denial without parsing an
RPC message:

```ts
import { Denial, PolicyDeniedError, spend } from "@zetasdk/sdk";

try {
  await spend({ line, amount, endpoint });
} catch (error) {
  if (error instanceof PolicyDeniedError && error.denial === Denial.PerCallCap) {
    console.log("The request is above this agent's per-call limit.");
  }
}
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
