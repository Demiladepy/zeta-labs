# Pyth track — form paste only

## Track

Best use of Pyth market data (or Pyth / oracle track name on the form)

## Project name

Zeta Labs

## Short description (paste)

Zeta Labs is policy-bounded credit for Solana agents. For the Pyth track we pull
live Hermes prices for `Equity.US.AAPL/USD`, `Crypto.AAPLX/USD`, and
`Crypto.AAPLON/USD`, measure equity↔tokenized basis in bps, and emit an
ALLOW / TIGHTEN / HALT credit signal that operators use before agent draws on our
Devnet vault/policy spine.

We compare (not just display) equity vs xStock vs Ondo feeds as a lending-risk
input. On-chain Pyth CPI inside the vault is not claimed in this packet — Fair
programs stay frozen; the market-data function is live via Hermes today.

## Links

| Field | URL |
| --- | --- |
| GitHub | https://github.com/Demiladepy/zeta-labs |
| Pyth docs in repo | https://github.com/Demiladepy/zeta-labs/blob/main/docs/PYTH.md |
| Live ops UI | https://zetalabsx.vercel.app |
| Vault (Devnet) | https://explorer.solana.com/address/4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi?cluster=devnet |

## Demo command

```bat
cd /d C:\Users\User\zeta-labs\packages\sdk
npm run pyth:aapl-compare
```

## Team

Demilade · Anurag (DubeyJi03) · Joshna (Joshna907)
