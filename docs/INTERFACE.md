# Interface freeze — Day 1 (23 Sep 2026)

This file and `crates/zeta-interface` are the merge-safety contract.
Vault, Policy, SDK, and the dashboard all consume them. **Do not fork
layouts.** Changes require agreement from Demilade + Anurag + Joshna.

TypeScript mirror: `packages/sdk/src/types.ts`. Field order, widths,
and discriminators must match the Rust crate byte-for-byte.

---

## Why pay-kit dictates the vault hot path

Payment Channels (mainnet/devnet program
`CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`) is the settlement
layer behind x402 `upto` and MPP `session`.

A metered call is:

```
open(deposit = maxAmount)
  → off-chain vouchers (operator-signed, cumulative)
  → settle_and_seal
  → distribute          // pays merchant, refunds unused to payer
```

`open` is payer-signed and pulls USDC from `payer_token_account`.
The vault PDA **is** that payer. The agent never holds unconstrained
USDC. `draw` CPIs `open`; `repay` books `settled` after `distribute`
refunds the unused ceiling back to the pool ATA.

`open` wire header (28 bytes, then distribution preimage):

| Field | Type | Notes |
| --- | --- | --- |
| `salt` | `u64` | PDA disambiguator |
| `deposit` | `u64` | ceiling = x402 `maxAmount` |
| `grace_period` | `u32` | seconds, must be ≥ 1 |
| `open_slot` | `u64` | client-supplied, current-or-recent |

PDA seeds: `["channel", payer, payee, mint, authorized_signer, salt, open_slot]`.

x402 `upto` roles we lock:

| Channel role | Zeta actor |
| --- | --- |
| `payer` | Credit Vault PDA (pool authority) |
| `payer_token_account` | Pool USDC ATA |
| `payee` | x402 operator (self-facilitating merchant) |
| `authorized_signer` | same operator (voucher author) |
| `rent_payer` | fee payer on the tx (agent or relayer) |
| `deposit` | `evaluate`-approved ceiling |

---

## Programs

| Program | Placeholder ID (replace on deploy) |
| --- | --- |
| Policy Registry | `Pol1cyReg1stry11111111111111111111111111111` |
| Credit Vault | `Cred1tVau1t1111111111111111111111111111111` |
| Payment Channels | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |

Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

---

## Account layouts

All accounts: 8-byte discriminator, then fields, then bump. Little-endian.
See `crates/zeta-interface/src/accounts.rs`.

### `Pool` — seeds `["pool", authority, mint]`

`authority` (lender), `mint`, `vault_ata`, `deposited`, `outstanding`, `bump`.

`outstanding` is **in-flight channel deposits only** (sum of `line.reserved`).
`deposited` drops by `settled` on `repay`. Unused reservation returns to
the pool ATA and leaves `outstanding`. Lifetime spend lives on
`CreditLine.drawn`.

### `CreditLine` — seeds `["line", pool, agent]`

`pool`, `agent`, `policy`, `limit`, `drawn`, `reserved`, `bump`.

Invariant (P1): `drawn + reserved + new_draw ≤ limit`.

### `Policy` — seeds `["policy", issuer, seed]`

v1 live: `per_call_cap`, `expires_at` (`i64`, `0` = none), `revoked`.

v2 reserved (zero = unused): `rolling_cap`, `total_cap`, `acl_version`.
Do not reuse these bytes.

### `AuditRecord` — event, not an account

Emitted on every `evaluate`, allow or deny. Fields in `accounts.rs`.

---

## `evaluate` — frozen signature

```
evaluate(policy, amount, now_unix, recipient, category) -> Result<(), Denial>
```

Ordered checks. First failure wins. Always emit `AuditRecord`.

| Order | Check | Denial | Phase |
| --- | --- | --- | --- |
| 1 | `revoked == true` | `Revoked` | 1 |
| 2 | `expires_at != 0 && now >= expires_at` | `Expired` | 1 |
| 3 | `amount == 0 \|\| amount > per_call_cap` | `PerCallCap` | 1 |
| 4 | rolling window | `RollingCap` | 2 |
| 5 | lifetime total | `TotalCap` | 2 |
| 6 | recipient / category ACL | `NotAllowlisted` | 2 |

`recipient` and `category` are in the v1 signature so the CPI does
not change in Phase 2. v1 ignores them.

`Denial` is a `u8`. `0` = allow. SDK maps these to typed errors.

---

## Instruction set (v1)

### Policy Registry

- `register_policy(per_call_cap, expires_at, seed)`
- `evaluate(amount, recipient, category)`
- `revoke()` — issuer only. Immediate. P3.

### Credit Vault

- `create_pool()`
- `deposit(amount)`
- `open_line(limit)` — line points at an existing policy
- `draw(amount, salt, grace_period, open_slot)` — CPI `evaluate` then CPI Payment Channels `open`
- `repay(settled, reserved)` — books actual spend, releases unused reservation

`draw` reserves `amount` on the line (`reserved += amount`,
`pool.outstanding += amount`) **before** the channel CPI.

`repay` after `distribute`: `reserved -= reserved_this_draw`,
`drawn += settled`, `outstanding -= reserved_this_draw`,
`deposited -= settled`.

---

## SDK surface (Joshna)

```
createPool({ authority, mint })
openLine({ pool, agent, policy, limit })
spend({ line, amount, endpoint })   // evaluate + draw + x402 fetch
revoke({ policy })
proof({ tx })                       // explorer + audit decode
```

One decoder. Dashboard reads the same functions. Do not write a second.

---

## Change protocol

Open an issue titled `iface: …`. Both program owners ack. Bump
`INTERFACE_VERSION` in `zeta-interface`. Joshna updates the TS mirror
in the same PR.
