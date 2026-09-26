/**
 * Frozen Day-1 mirror of crates/zeta-interface.
 * Field order, widths, and denial codes must match the Rust crate.
 * Bump INTERFACE_VERSION in the same PR as the Rust crate.
 */

export const INTERFACE_VERSION = 3 as const;

export const POOL_LEN = 128;
export const CREDIT_LINE_LEN = 136;
export const POLICY_LEN = 96;
export const POLICY_ACL_LEN = 304;
export const LINE_USAGE_LEN = 64;
export const AUDIT_RECORD_LEN = 136;
export const POLICY_ACL_MAX_RECIPIENTS = 8;

export const ACCOUNT_DISCRIMINATOR = {
  pool: 0x5a455441504f4f4cn,
  line: 0x5a4554414c494e45n,
  policy: 0x5a455441504f4c59n,
  /** ASCII "ZETAPACL" as u64 LE discriminant. */
  policyAcl: 0x5a4554415041434cn,
  /** ASCII "ZETAUSAG". */
  lineUsage: 0x5a45544155534147n,
  audit: 0x5a45544141554454n,
} as const;

export const POLICY_IX = {
  registerPolicy: 0,
  evaluate: 1,
  revoke: 2,
  setAcl: 3,
  setCaps: 4,
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

/** Zeta program IDs deployed on Solana devnet. See docs/PROGRAM_IDS.md. */
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
  /** P5 tumbling window seconds; required nonzero when rollingCap != 0. */
  rollingWindowSecs: number;
};

/** Sibling PDA for P4 category + recipient allowlist (`["acl", policy]`). */
export type PolicyAcl = {
  discriminator: bigint;
  policy: Uint8Array;
  categoryMask: number;
  recipientCount: number;
  bump: number;
  recipients: Uint8Array[];
};

/** Per-line rolling meter (`["usage", line]`, Credit Vault). */
export type LineUsage = {
  discriminator: bigint;
  line: Uint8Array;
  windowStart: bigint;
  rollingSpent: bigint;
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
  /** P4 category (INTERFACE_VERSION ≥ 2). Defaults to 0 when omitted at encode. */
  category?: number;
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
