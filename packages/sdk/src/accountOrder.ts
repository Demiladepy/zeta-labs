/**
 * Account-order mirror of crates/zeta-interface builders.
 * Do not invent a second order — processors reject wrong metas.
 */

export const ACCOUNT_ORDER = {
  registerPolicy: ["issuer(s)", "policyPda(w)"] as const,
  evaluate: ["policy", "line", "agent", "clock"] as const,
  revoke: ["issuer(s)", "policy(w)"] as const,
  createPool: ["authority(s)", "mint", "poolPda(w)", "vaultAta"] as const,
  deposit: ["authority(s)", "pool(w)"] as const,
  depositWithTransfer: [
    "authority(s)",
    "pool(w)",
    "sourceAta(w)",
    "vaultAta(w)",
    "tokenProgram",
  ] as const,
  openLine: ["authority(s)", "pool", "policy", "agent", "linePda(w)"] as const,
  draw: [
    "agent(s)",
    "pool(w)",
    "line(w)",
    "policy",
    "payee",
    "rentPayer(s)",
    "clock",
  ] as const,
  /** After draw core: channelsProgram + 14 Payment Channels open accounts. */
  drawWithChannelOpenTail: ["channelsProgram", "...open[14]"] as const,
  repay: ["signer(s)", "pool(w)", "line(w)"] as const,
} as const;

/** PDA pre-alloc sizes Joshna must createAccount before register/create/open. */
export const PDA_ALLOC = {
  pool: 128,
  policy: 96,
  line: 136,
} as const;
