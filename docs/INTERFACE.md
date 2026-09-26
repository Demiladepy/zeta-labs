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

| Program | ID (Devnet live) |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |
| Payment Channels | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |

Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

`INTERFACE_VERSION` = **3** (set_caps + LineUsage + P5 rolling/total).

---

## Account layouts

All accounts: 8-byte discriminator, then fields, then bump. Little-endian.
See `crates/zeta-interface/src/accounts.rs`.

### `Pool` — seeds `["pool", authority, mint]`

`authority` (lender), `mint`, `vault_ata`, `deposited`, `outstanding`, `bump`.
`_pad[0]` is the **reentrancy lock** (`1` while Payment Channels CPI is in
flight on `draw`; mutators refuse with custom error `7` = `Reentrancy` when set).

`outstanding` is **in-flight channel deposits only** (sum of `line.reserved`).
`deposited` drops by `settled` on `repay`. Unused reservation returns to
the pool ATA and leaves `outstanding`. Lifetime spend lives on
`CreditLine.drawn`.

**Revoke vs in-flight:** `revoke` immediately fails new `evaluate` / `draw` /
`open_line`. It does **not** clear `line.reserved` or open channels — those
settle via normal `repay` after `distribute`. No on-chain clawback.

### `CreditLine` — seeds `["line", pool, agent]`

`pool`, `agent`, `policy`, `limit`, `drawn`, `reserved`, `bump`.

Invariant (P1): `drawn + reserved + new_draw ≤ limit`.

### `Policy` — seeds `["policy", issuer, seed]`

v1 live: `per_call_cap`, `expires_at` (`i64`, `0` = none), `revoked`.

v2 (`INTERFACE_VERSION` >= 2): `acl_version` gates P4.

v3 (`INTERFACE_VERSION = 3`): `rolling_cap` / `total_cap` / `rolling_window_secs`
(bytes 84-87) are live for P5. `0` caps = that check off.

### `PolicyAcl` — seeds `["acl", policy]` (v2 / P4)

Sibling PDA owned by Policy Registry. Fixed **304** bytes:

| Field | Type | Notes |
| --- | --- | --- |
| `discriminator` | `u64` | `ZETAPACL` |
| `policy` | `[u8;32]` | parent policy PDA |
| `category_mask` | `u32` | bit `N` ⇒ category `N` allowed (0–31) |
| `recipient_count` | `u8` | `0..=8` |
| `bump` | `u8` | |
| `_pad` | `[u8;2]` | |
| `recipients` | `[[u8;32];8]` | first `recipient_count` slots live |

When `policy.acl_version != 0`: ACL account required; category bit must be
set **and** recipient must match → else `Denial::NotAllowlisted` (6).
When `acl_version == 0`: v1 behavior (ignore recipient/category); no ACL
account required.

### `LineUsage` — seeds `["usage", line]` (v3 / P5)

Sibling PDA owned by Credit Vault. Fixed **64** bytes: tumbling window meter
(`window_start`, `rolling_spent`). Required when `rolling_cap != 0`.

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
| 4 | rolling window (`rolling_cap != 0`) | `RollingCap` | 2 / P5 |
| 5 | lifetime total (`drawn+reserved+amount`) | `TotalCap` | 2 / P5 |
| 6 | recipient / category ACL (`acl_version != 0`) | `NotAllowlisted` | 2 / P4 |

`recipient` and `category` are in the wire signature. v1 (`acl_version == 0`)
ignores them. Vault `draw` inlines the same shared `evaluate` (ACL via
`acl_allows`; P5 via line + `LineUsage` fields on `EvaluateInput`).

When `rolling_cap != 0`, tumbling window uses `LineUsage` PDA
(`["usage", line]`, Credit Vault, 64 bytes). Deny does not mutate usage;
allow applies `apply_draw`.

`Denial` is a `u8`. `0` = allow. SDK maps these to typed errors.

---

## Instruction set

### Policy Registry

- `register_policy(per_call_cap, expires_at, seed)`
- `evaluate(amount, recipient, category)`
- `revoke()` — issuer only. Immediate. P3.
- `set_acl(category_mask, recipient_count, recipients[8])` — tag `3`. Issuer
  signer; creates/updates ACL PDA; sets `policy.acl_version = 1` (or bumps).
- `set_caps(rolling_cap, total_cap, rolling_window_secs)` — tag `4`. Issuer
  signer; `rolling_cap != 0` requires nonzero window.
### Credit Vault

- `create_pool()`
- `deposit(amount)`
- `open_line(limit)` — line points at an existing policy; policy must be
  owned by Policy Registry
- `draw(amount, salt, grace_period, open_slot, category)` — `DrawArgs` is
  **30** bytes (v2 adds `category: u16`). Evaluate first (audit always),
  then reserve + Payment Channels `open` CPI. Clock key must be the Clock
  sysvar. When `acl_version != 0`, ACL account follows clock.
- `repay(reserved_this_draw, settled)` — books actual spend, releases unused
  reservation; `line.pool` must match the pool account

`draw` reserves `amount` on the line (`reserved += amount`,
`pool.outstanding += amount`) **before** the channel CPI.

`repay` after `distribute`: `reserved -= reserved_this_draw`,
`drawn += settled`, `outstanding -= reserved_this_draw`,
`deposited -= settled`.

### Instruction accounts

Little-endian. First byte is the tag (`crates/zeta-interface` encode/decode).
Client **does not** pre-create PDA accounts. Init instructions take a trailing
`SystemProgram` account; the program `create_account`s the PDA via
`invoke_signed` (see `docs/PDA.md`). Processors refuse a non-zero discriminator
on already-owned accounts.

**Policy `register_policy`** — `0` issuer (signer, writable) · `1` policy PDA (writable) · `2` system program

**Policy `evaluate`** — `0` policy · `1` line (audit) · `2` agent (audit) · `3` clock · optional `4` acl (when `acl_version != 0`)

**Policy `revoke`** — `0` issuer (signer) · `1` policy (writable)

**Policy `set_acl`** — `0` issuer (signer, writable) · `1` policy (writable) · `2` acl PDA (writable) · `3` system program

**Policy `set_caps`** — `0` issuer (signer) · `1` policy (writable)

**Vault `create_pool`** — `0` authority (signer, writable) · `1` mint · `2` pool PDA (writable) · `3` vault ATA · `4` system program

**Vault `deposit`** — `0` authority (signer) · `1` pool (writable). Optional token CPI: `2` source ATA · `3` vault ATA · `4` token program.

**Vault `open_line`** — `0` authority (signer, writable) · `1` pool · `2` policy · `3` agent · `4` line PDA (writable) · `5` system program · `6` clock. Underwriting v1: LTV from policy tightness vs free pool liquidity; revoked/expired refuse; custom error `6` = `UnderwritingDenied`.

**Vault `draw`** — `0` agent (signer) · `1` pool (writable) · `2` line (writable) · `3` policy · `4` payee · `5` rent_payer (signer) · `6` clock · optional `acl` (when `acl_version != 0`) · optional `usage` writable + system (when `rolling_cap != 0`). Optional CPI: next account **must** be Payment Channels program id + the 14 `open` accounts below. Pool reentrancy lock is set around the CPI (custom `7` if nested vault entry). Trailing ix bytes after the 30-byte draw header are the distribution preimage.

**Vault `repay`** — `0` signer (agent or pool authority) · `1` pool (writable) · `2` line (writable)

`evaluate` / `draw` always `sol_log_data` a packed 136-byte `AuditRecord` (allow or deny). Deny custom error = `100 + Denial`. `draw` return data on allow is the encoded Payment Channels `open` ix (disc `1` + 28-byte header + extra).

### Payment Channels `open` CPI (Anurag)

Account order (pay-kit Codama client):

0. payer (writable, signer via vault PDA)  
1. rent_payer (writable, signer)  
2. payee  
3. mint  
4. authorized_signer  
5. channel (writable)  
6. payer_token_account (writable)  
7. channel_token_account (writable)  
8. token_program  
9. system_program  
10. rent  
11. associated_token_program  
12. event_authority  
13. self_program  

Ix data: `1u8` ‖ `salt u64` ‖ `deposit u64` ‖ `grace_period u32` ‖ `open_slot u64` ‖ extra.  
`open_slot` must be current-or-recent (`OPEN_SLOT_WINDOW = 1500`).  
PDA seeds (frozen): `["channel", payer, payee, mint, authorized_signer, salt, open_slot]`.

---

## SDK surface (Joshna)

```
createPool({ authority, mint })
openLine({ pool, agent, policy, limit })
spend({ line, amount, endpoint })   // evaluate + draw + x402 fetch
revoke({ policy })
setAcl({ policy, categoryMask, recipients })
proof({ tx })                       // explorer + audit decode
```

One decoder. Dashboard reads the same functions. Do not write a second.

---

## Change protocol

Open an issue titled `iface: …`. Both program owners ack. Bump
`INTERFACE_VERSION` in `zeta-interface`. Joshna updates the TS mirror
in the same PR.
