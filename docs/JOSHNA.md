# Joshna (SuperGirl) — SDK, infra, dashboard

You own everything the 4-person plan split across "person 3" and
"person 4": the SDK, the decoder, deploy/faucet scripts, and (Phase 2)
the three-panel dashboard.

## Phase 1 (this week)

Ship `@zeta/sdk` far enough that:

1. We can drive the seven-step demo from a script.
2. One external team can try it.

Surface (names frozen):

```ts
createPool({ authority, mint })
openLine({ pool, agent, policy, limit })
spend({ line, amount, endpoint })
revoke({ policy })
proof({ signature })
```

Start from `packages/sdk/src/types.ts`. That file is the TypeScript
mirror of `crates/zeta-interface`. If a field does not exist there,
it does not exist.

**One decoder.** `decodePool`, `decodeLine`, `decodePolicy`,
`decodeAudit`. The dashboard will import these. Do not let a second
layout copy appear in the frontend.

Also this week: a `scripts/` path that airdrops / points at a
devnet RPC and can deploy once Demilade has program keypairs.

## Phase 2

Dashboard, three panels, live from chain state:

1. **Lender** — pool deposits, outstanding, lines.
2. **Agent** — line, remaining, last spend, last denial.
3. **Audit** — every `evaluate` allow/deny. Most polish. This is the
   safety story made visible.

SDK hardening: typed `Denial` errors, 10-line quickstart, faucet
docs, publish.

Implementation status: the three dashboard panels are built in
`packages/dashboard`. It automatically discovers a connected pool, credit
line, and policy from the deployed programs, then renders their read-only
devnet state and audit history. Specific addresses and a clearly labelled
demo fallback remain available through Connection settings.

## Do not

- Invent account fields.
- Decode with a different endianness or discriminator.
- Build an on-ramp, a merchant app, or a consumer wallet.
