# Anurag — Payment Channels + x402

Read `docs/INTERFACE.md` first. The vault does not invent a payment
primitive. `draw` is a CPI into Payment Channels `open`.

## Your Phase 1 job

Wire the real pay-kit so this path is un-fakeable on devnet:

```
agent spend()
  → vault.draw          // reserves ceiling, CPIs open
  → HTTP 402 upto       // pay-kit gate
  → meter
  → settle_and_seal + distribute
  → vault.repay         // books settled, releases unused
```

Repo to read before writing anything in the vault hot path:

- https://github.com/solana-foundation/pay-kit
- https://github.com/solana-foundation/payment-channels
- https://pay.sh/docs/sdk/rust/schemes  (`paid_upto_*`)
- https://x402.org / SVM `upto` profile

Program: `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`.

## Contract we froze for you

`crates/zeta-interface/src/paykit.rs` → `DrawChannelSpec`.

- `payer` = pool PDA
- `deposit` = evaluate-approved ceiling = x402 `maxAmount` (strict `==`)
- `payee` = `authorized_signer` = operator (self-facilitating)
- `salt: u64`, `grace_period: u32 ≥ 1`, `open_slot: u64` in-window

Do not have the agent hold the draw USDC. If pay-kit's client assumes
the signer is the token payer, wrap it: the agent signs `draw`, the
vault PDA signs `open`.

## PDA provisioning (required for create_pool / register / open_line)

Read **`docs/PDA.md`**. Programs allocate pool / policy / line PDAs themselves
when you pass trailing `SystemProgram` (SDK builders already do this). You do
not need a separate client provisioner.

## Demo endpoints

Phase 1: any live pay-kit / playground `upto` route on devnet is
enough. Phase 3: swap in a real World's Fair x402 endpoint.

## Phase 2

Swig delegated authority for the line→agent grant. Zcash only if
confidential repay is load-bearing from this build — otherwise drop it.
