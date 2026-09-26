/**
 * Account-order mirror of crates/zeta-interface builders.
 * Do not invent a second order — processors reject wrong metas.
 */

export const ACCOUNT_ORDER = {
  registerPolicy: ["issuer(s,w)", "policyPda(w)", "systemProgram"] as const,
  evaluate: ["policy", "line", "agent", "clock"] as const,
  /** Append when policy.acl_version != 0. */
  evaluateWithAcl: ["policy", "line", "agent", "clock", "acl"] as const,
  revoke: ["issuer(s)", "policy(w)"] as const,
  setAcl: ["issuer(s,w)", "policy(w)", "aclPda(w)", "systemProgram"] as const,
  createPool: ["authority(s,w)", "mint", "poolPda(w)", "vaultAta", "systemProgram"] as const,
  deposit: ["authority(s)", "pool(w)"] as const,
  depositWithTransfer: [
    "authority(s)",
    "pool(w)",
    "sourceAta(w)",
    "vaultAta(w)",
    "tokenProgram",
  ] as const,
  openLine: ["authority(s,w)", "pool", "policy", "agent", "linePda(w)", "systemProgram"] as const,
  draw: [
    "agent(s)",
    "pool(w)",
    "line(w)",
    "policy",
    "payee",
    "rentPayer(s)",
    "clock",
  ] as const,
  /** When policy.acl_version != 0, ACL sits after clock before optional CPI. */
  drawWithAcl: [
    "agent(s)",
    "pool(w)",
    "line(w)",
    "policy",
    "payee",
    "rentPayer(s)",
    "clock",
    "acl",
  ] as const,
  /** After draw core: channelsProgram + 14 Payment Channels open accounts. */
  drawWithChannelOpenTail: ["channelsProgram", "...open[14]"] as const,
  repay: ["signer(s)", "pool(w)", "line(w)"] as const,
} as const;

/** PDA data lengths (program allocates via SystemProgram CPI). */
export const PDA_ALLOC = {
  pool: 128,
  policy: 96,
  policyAcl: 304,
  line: 136,
} as const;
