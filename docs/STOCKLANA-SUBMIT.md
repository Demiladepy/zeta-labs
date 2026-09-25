# Stocklana — form paste only

Use this for the [Stocklana](https://hackathons.solana.com/hackathons/stocklana)
submit form. The root [README.md](../README.md) is written for **Colosseum
World's Fair**, not Stocklana.

## Project name

Zeta Labs

## Short description (paste)

Zeta Labs is policy-bounded credit for Solana agents: a lender deposits USDC
into a program-owned vault, an agent gets a credit line with on-chain
cap/expiry/revoke, and every spend is evaluated before Payment Channels
settlement. The agent never holds unconstrained draw USDC.

We are submitting the working Devnet spine (programs + spend path + ops
dashboard). Tokenized-equity / PreStock collateral is **not** integrated this
week — our Fair focus is agent credit rails on Solana.

## Links

| Field | URL |
| --- | --- |
| GitHub | https://github.com/Demiladepy/zeta-labs |
| Live demo | https://zetalabsx.vercel.app |
| Pitch / demo video | _optional — record locally (checklist below)_ |

## Bounties

**Do not claim:** PreStocks, Tessera, Clawpump, Meteora DBC, or Pyth for this
submission. This packet is main-track presence with an honest agent-credit
demo, not a stock-token integration.

## Team

Invite on the form: Demilade · Anurag (DubeyJi03) · Joshna (Joshna907)

## Demo video checklist (~90s, local)

1. Open live dashboard URL (or `npm run dev` in `packages/dashboard`)
2. Overview → show discovered pool / line / policy (or labelled demo fallback)
3. Lender panel → deposited / outstanding
4. Agent panel → limit / drawn
5. Audit panel → allow or deny
6. Cut to explorer: Policy `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` and Vault `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` (Devnet)

## After submit

Keep shipping for Colosseum World's Fair (final submit **12 Oct 2026**).
