/** Builders for every Phase-1 Zeta instruction outside the pay-kit hot path. */
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import {
  CREDIT_VAULT_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
  POLICY_IX,
  VAULT_IX,
} from "./types.js";
import { assertI64, assertU16, assertU64, writeU64LE } from "./paykit/bytes.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function u64Instruction(tag: number, value: bigint): Buffer {
  const data = new Uint8Array(9);
  data[0] = tag;
  writeU64LE(data, 1, value);
  return Buffer.from(data);
}

export function findPoolPda(authority: PublicKey, mint: PublicKey, programId = new PublicKey(CREDIT_VAULT_PROGRAM_ID)): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), authority.toBytes(), mint.toBytes()],
    programId,
  )[0];
}

export function findLinePda(pool: PublicKey, agent: PublicKey, programId = new PublicKey(CREDIT_VAULT_PROGRAM_ID)): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("line"), pool.toBytes(), agent.toBytes()],
    programId,
  )[0];
}

export function findPolicyPda(issuer: PublicKey, seed: bigint, programId = new PublicKey(POLICY_REGISTRY_PROGRAM_ID)): PublicKey {
  assertU64("policy seed", seed);
  const seedBytes = Buffer.alloc(8);
  seedBytes.writeBigUInt64LE(seed);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), issuer.toBytes(), seedBytes],
    programId,
  )[0];
}

export function findAclPda(policy: PublicKey, programId = new PublicKey(POLICY_REGISTRY_PROGRAM_ID)): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("acl"), policy.toBytes()],
    programId,
  )[0];
}

export function buildCreatePoolInstruction(args: {
  authority: PublicKey;
  mint: PublicKey;
  pool?: PublicKey;
  vaultAta?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID);
  const pool = args.pool ?? findPoolPda(args.authority, args.mint, programId);
  const vaultAta = args.vaultAta ?? getAssociatedTokenAddressSync(args.mint, pool, true);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: vaultAta, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([VAULT_IX.createPool]),
  });
}

export function buildDepositInstruction(args: {
  authority: PublicKey;
  pool: PublicKey;
  amount: bigint;
  sourceAta?: PublicKey;
  vaultAta?: PublicKey;
  tokenProgram?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  assertU64("deposit amount", args.amount);
  if (args.amount === 0n) throw new Error("deposit amount must be positive");
  const keys: AccountMeta[] = [
    { pubkey: args.authority, isSigner: true, isWritable: false },
    { pubkey: args.pool, isSigner: false, isWritable: true },
  ];
  if (args.sourceAta || args.vaultAta) {
    if (!args.sourceAta || !args.vaultAta) {
      throw new Error("sourceAta and vaultAta must be provided together");
    }
    keys.push(
      { pubkey: args.sourceAta, isSigner: false, isWritable: true },
      { pubkey: args.vaultAta, isSigner: false, isWritable: true },
      { pubkey: args.tokenProgram ?? TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    );
  }
  return new TransactionInstruction({
    programId: args.programId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID),
    keys,
    data: u64Instruction(VAULT_IX.deposit, args.amount),
  });
}

export function buildOpenLineInstruction(args: {
  authority: PublicKey;
  pool: PublicKey;
  policy: PublicKey;
  agent: PublicKey;
  limit: bigint;
  line?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  assertU64("line limit", args.limit);
  if (args.limit === 0n) throw new Error("line limit must be positive");
  const programId = args.programId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID);
  const line = args.line ?? findLinePda(args.pool, args.agent, programId);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: args.pool, isSigner: false, isWritable: false },
      { pubkey: args.policy, isSigner: false, isWritable: false },
      { pubkey: args.agent, isSigner: false, isWritable: false },
      { pubkey: line, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: u64Instruction(VAULT_IX.openLine, args.limit),
  });
}

export function buildRegisterPolicyInstruction(args: {
  issuer: PublicKey;
  seed: bigint;
  perCallCap: bigint;
  expiresAt: bigint;
  policy?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  assertU64("policy seed", args.seed);
  assertU64("perCallCap", args.perCallCap);
  assertI64("expiresAt", args.expiresAt);
  if (args.perCallCap === 0n) throw new Error("perCallCap must be positive");
  const programId = args.programId ?? new PublicKey(POLICY_REGISTRY_PROGRAM_ID);
  const policy = args.policy ?? findPolicyPda(args.issuer, args.seed, programId);
  const data = new Uint8Array(25);
  data[0] = POLICY_IX.registerPolicy;
  writeU64LE(data, 1, args.seed);
  writeU64LE(data, 9, args.perCallCap);
  new DataView(data.buffer).setBigInt64(17, args.expiresAt, true);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.issuer, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildEvaluateInstruction(args: {
  policy: PublicKey;
  line: PublicKey;
  agent: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  category?: number;
  clock?: PublicKey;
  /** Required when policy.aclVersion != 0. */
  acl?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  assertU64("evaluate amount", args.amount);
  if (args.amount === 0n) throw new Error("evaluate amount must be positive");
  const category = args.category ?? 0;
  assertU16("category", category);
  const data = new Uint8Array(43);
  data[0] = POLICY_IX.evaluate;
  writeU64LE(data, 1, args.amount);
  data.set(args.recipient.toBytes(), 9);
  new DataView(data.buffer).setUint16(41, category, true);
  const keys: AccountMeta[] = [
    { pubkey: args.policy, isSigner: false, isWritable: false },
    { pubkey: args.line, isSigner: false, isWritable: false },
    { pubkey: args.agent, isSigner: false, isWritable: false },
    {
      pubkey:
        args.clock ??
        new PublicKey("SysvarC1ock11111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    },
  ];
  if (args.acl) {
    keys.push({ pubkey: args.acl, isSigner: false, isWritable: false });
  }
  return new TransactionInstruction({
    programId: args.programId ?? new PublicKey(POLICY_REGISTRY_PROGRAM_ID),
    keys,
    data: Buffer.from(data),
  });
}

export function buildRevokeInstruction(args: {
  issuer: PublicKey;
  policy: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: args.programId ?? new PublicKey(POLICY_REGISTRY_PROGRAM_ID),
    keys: [
      { pubkey: args.issuer, isSigner: true, isWritable: false },
      { pubkey: args.policy, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([POLICY_IX.revoke]),
  });
}

/** P4: create/update PolicyAcl PDA and bump policy.acl_version. */
export function buildSetAclInstruction(args: {
  issuer: PublicKey;
  policy: PublicKey;
  categoryMask: number;
  recipients: PublicKey[];
  acl?: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  if (args.recipients.length > 8) throw new Error("at most 8 ACL recipients");
  const programId = args.programId ?? new PublicKey(POLICY_REGISTRY_PROGRAM_ID);
  const acl = args.acl ?? findAclPda(args.policy, programId);
  const data = new Uint8Array(1 + 4 + 1 + 32 * 8);
  data[0] = POLICY_IX.setAcl;
  new DataView(data.buffer).setUint32(1, args.categoryMask >>> 0, true);
  data[5] = args.recipients.length;
  for (let i = 0; i < args.recipients.length; i++) {
    data.set(args.recipients[i]!.toBytes(), 6 + i * 32);
  }
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.issuer, isSigner: true, isWritable: true },
      { pubkey: args.policy, isSigner: false, isWritable: true },
      { pubkey: acl, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}
