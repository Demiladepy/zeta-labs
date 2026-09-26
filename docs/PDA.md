# PDA provisioning path (Anurag / Joshna)

**Programs allocate their own PDAs.** A wallet cannot
`SystemProgram.createAccount` a PDA address — only the owning program can
sign the create via seeds (`invoke_signed`).

Builders already append `SystemProgram` on the three init instructions.
You do **not** need a separate client-side provisioner for Phase 1.

## Program IDs (Devnet, live)

| Role | Program ID |
| --- | --- |
| Policy Registry | `G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk` |
| Credit Vault | `4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi` |
| Payment Channels | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |
| Devnet USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

## Seeds (frozen)

```
pool PDA    = findProgramAddress(["pool",   authority_pubkey, mint_pubkey],           CREDIT_VAULT)
line PDA    = findProgramAddress(["line",   pool_pubkey,      agent_pubkey],          CREDIT_VAULT)
policy PDA  = findProgramAddress(["policy", issuer_pubkey,    seed_u64_le_8_bytes],   POLICY_REGISTRY)
acl PDA     = findProgramAddress(["acl",    policy_pubkey],                           POLICY_REGISTRY)
usage PDA   = findProgramAddress(["usage",  line_pubkey],                             CREDIT_VAULT)
channel PDA = findProgramAddress(
                ["channel", payer, payee, mint, authorized_signer, salt_u64_le, open_slot_u64_le],
                PAYMENT_CHANNELS
              )
```

SDK helpers: `findPoolPda`, `findLinePda`, `findPolicyPda`, `findAclPda`,
`findUsagePda` in `packages/sdk/src/instructions.ts`.

## Spaces (exact data lengths)

| PDA | Space (bytes) |
| --- | --- |
| pool | 128 |
| policy | 96 |
| policy ACL | 304 |
| line usage | 64 |
| line | 136 |

## Init account order (trailing SystemProgram = provision path)

```
register_policy:
  0 issuer (signer, writable — pays rent)
  1 policy PDA (writable)
  2 System Program

set_acl:
  0 issuer (signer, writable — pays rent)
  1 policy (writable)
  2 acl PDA (writable)
  3 System Program

create_pool:
  0 authority (signer, writable — pays rent)
  1 mint
  2 pool PDA (writable)
  3 vault ATA (pool-owned associated token account)
  4 System Program

open_line:
  0 authority (signer, writable — pays rent)
  1 pool
  2 policy
  3 agent
  4 line PDA (writable)
  5 System Program
```

On first call, the program CPI-creates the PDA (rent-exempt, owned by the
program). If the PDA already exists with the right owner + length, the
create is skipped and the instruction just writes the layout.

## What Anurag should do

1. Pull `main`.
2. Use SDK builders (`buildCreatePoolInstruction`, `buildRegisterPolicyInstruction`,
   `buildOpenLineInstruction`) — they already include SystemProgram.
3. Derive PDAs with the helpers above; do **not** call
   `SystemProgram.createAccount` on those addresses from the client.
4. Channel PDA for Payment Channels `open` is still created by that program
   during the vault `draw` CPI (payer = pool PDA).

## Pasteable env

```
POLICY_REGISTRY_PROGRAM_ID=G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk
CREDIT_VAULT_PROGRAM_ID=4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi
PAYMENT_CHANNELS_PROGRAM_ID=CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX
DEVNET_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```
