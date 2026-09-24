/**
 * Frozen Day-1 mirror of crates/zeta-interface.
 * Field order, widths, and denial codes must match the Rust crate.
 * Bump INTERFACE_VERSION in the same PR as the Rust crate.
 */

export const INTERFACE_VERSION = 1 as const;

export const POOL_LEN = 128;
export const CREDIT_LINE_LEN = 136;
export const POLICY_LEN = 96;
export const AUDIT_RECORD_LEN = 136;

export const ACCOUNT_DISCRIMINATOR = {
  pool: 0x5a455441504f4f4cn,
  line: 0x5a4554414c494e45n,
  policy: 0x5a455441504f4c59n,
  audit: 0x5a45544141554454n,
} as const;

export const POLICY_IX = {
  registerPolicy: 0,
  evaluate: 1,
  revoke: 2,
} as const;

export const VAULT_IX = {
  createPool: 0,
  deposit: 1,
  openLine: 2,
  draw: 3,
  repay: 4,
} as const;

/** u8. 0 = allow. First failure wins. */
export const Denial = {
  Allow: 0,
  Revoked: 1,
  Expired: 2,
  PerCallCap: 3,
  RollingCap: 4,
  TotalCap: 5,
  NotAllowlisted: 6,
} as const;
export type Denial = (typeof Denial)[keyof typeof Denial];

export const PAYMENT_CHANNELS_PROGRAM_ID =
  "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";

/** Local keypair pubkeys — not deployed yet. See `.keys/README.md`. */
export const POLICY_REGISTRY_PROGRAM_ID =
  "G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk";

export const CREDIT_VAULT_PROGRAM_ID =
  "4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi";

export const DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export type Pool = {
  discriminator: bigint;
  authority: Uint8Array;
  mint: Uint8Array;
  vaultAta: Uint8Array;
  deposited: bigint;
  outstanding: bigint;
  bump: number;
};

export type CreditLine = {
  discriminator: bigint;
  pool: Uint8Array;
  agent: Uint8Array;
  policy: Uint8Array;
  limit: bigint;
  drawn: bigint;
  reserved: bigint;
  bump: number;
};

export type Policy = {
  discriminator: bigint;
  issuer: Uint8Array;
  seed: bigint;
  perCallCap: bigint;
  expiresAt: bigint;
  rollingCap: bigint;
  totalCap: bigint;
  aclVersion: number;
  revoked: boolean;
  bump: number;
};

export type AuditRecord = {
  discriminator: bigint;
  policy: Uint8Array;
  line: Uint8Array;
  agent: Uint8Array;
  amount: bigint;
  allowed: boolean;
  denial: Denial;
  slot: bigint;
  unixTs: bigint;
};

export type DrawArgs = {
  amount: bigint;
  salt: bigint;
  gracePeriod: number;
  openSlot: bigint;
};

export type RepayArgs = {
  reservedThisDraw: bigint;
  settled: bigint;
};

export type EvaluateArgs = {
  amount: bigint;
  recipient: Uint8Array;
  category: number;
};

export type DrawChannelSpec = {
  payer: Uint8Array;
  payerTokenAccount: Uint8Array;
  payee: Uint8Array;
  authorizedSigner: Uint8Array;
  mint: Uint8Array;
  rentPayer: Uint8Array;
  deposit: bigint;
  salt: bigint;
  gracePeriod: number;
  openSlot: bigint;
};
