import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNT_DISCRIMINATOR,
  Denial,
  buildCreatePoolInstruction,
  buildDepositInstruction,
  buildOpenLineInstruction,
  buildRegisterPolicyInstruction,
  buildRevokeInstruction,
  planVaultDrawOpen,
  decodeAudit,
  decodeLine,
  decodePolicy,
  decodePool,
  findLinePda,
  findPolicyPda,
  findPoolPda,
} from "../src/index.js";
import { Keypair } from "@solana/web3.js";

function bytes(length: number): Uint8Array {
  return new Uint8Array(length);
}

function discriminator(data: Uint8Array, value: bigint): DataView {
  const view = new DataView(data.buffer);
  view.setBigUint64(0, value, true);
  return view;
}

test("decodes frozen Pool layout in little-endian order", () => {
  const data = bytes(128);
  const view = discriminator(data, ACCOUNT_DISCRIMINATOR.pool);
  data.fill(1, 8, 40);
  data.fill(2, 40, 72);
  data.fill(3, 72, 104);
  view.setBigUint64(104, 500n, true);
  view.setBigUint64(112, 120n, true);
  data[120] = 254;

  const pool = decodePool(data);
  assert.equal(pool.deposited, 500n);
  assert.equal(pool.outstanding, 120n);
  assert.equal(pool.bump, 254);
  assert.equal(pool.authority[0], 1);
});

test("decodes frozen CreditLine and Policy layouts", () => {
  const lineData = bytes(136);
  const lineView = discriminator(lineData, ACCOUNT_DISCRIMINATOR.line);
  lineView.setBigUint64(104, 1_000n, true);
  lineView.setBigUint64(112, 250n, true);
  lineView.setBigUint64(120, 125n, true);
  lineData[128] = 7;
  const line = decodeLine(lineData);
  assert.deepEqual([line.limit, line.drawn, line.reserved], [1_000n, 250n, 125n]);

  const policyData = bytes(96);
  const policyView = discriminator(policyData, ACCOUNT_DISCRIMINATOR.policy);
  policyView.setBigUint64(40, 9n, true);
  policyView.setBigUint64(48, 50n, true);
  policyView.setBigInt64(56, -1n, true);
  policyView.setBigUint64(64, 0n, true);
  policyView.setBigUint64(72, 0n, true);
  policyView.setUint16(80, 0, true);
  policyData[82] = 1;
  policyData[83] = 3;
  const policy = decodePolicy(policyData);
  assert.equal(policy.seed, 9n);
  assert.equal(policy.expiresAt, -1n);
  assert.equal(policy.revoked, true);
});

test("decodes AuditRecord and rejects contradictory flags", () => {
  const data = bytes(136);
  const view = discriminator(data, ACCOUNT_DISCRIMINATOR.audit);
  view.setBigUint64(104, 42n, true);
  data[112] = 0;
  data[113] = Denial.Expired;
  view.setBigUint64(120, 99n, true);
  view.setBigInt64(128, -5n, true);
  const audit = decodeAudit(data);
  assert.equal(audit.allowed, false);
  assert.equal(audit.denial, Denial.Expired);
  assert.equal(audit.unixTs, -5n);

  data[112] = 1;
  assert.throws(() => decodeAudit(data), /disagrees/);
});

test("rejects a bad discriminator and malformed boolean", () => {
  assert.throws(() => decodePool(bytes(128)), /discriminator/);
  const data = bytes(96);
  discriminator(data, ACCOUNT_DISCRIMINATOR.policy);
  data[82] = 2;
  assert.throws(() => decodePolicy(data), /0 or 1/);
});

test("derives deterministic pool, policy, and line addresses", () => {
  const authority = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  const pool = findPoolPda(authority, mint);
  assert.equal(findPoolPda(authority, mint).toBase58(), pool.toBase58());
  assert.equal(findLinePda(pool, agent).toBase58(), findLinePda(pool, agent).toBase58());
  assert.equal(findPolicyPda(authority, 4n).toBase58(), findPolicyPda(authority, 4n).toBase58());
});

test("builders match the frozen instruction tags, widths, and account order", () => {
  const authority = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const pool = findPoolPda(authority, mint);
  const agent = Keypair.generate().publicKey;
  const policy = findPolicyPda(authority, 7n);

  const create = buildCreatePoolInstruction({ authority, mint });
  assert.equal(create.data.length, 1);
  assert.equal(create.data[0], 0);
  assert.deepEqual(
    create.keys.map((key) => [key.isSigner, key.isWritable]),
    [[true, true], [false, false], [false, true], [false, false]],
  );

  const register = buildRegisterPolicyInstruction({
    issuer: authority,
    seed: 7n,
    perCallCap: 50n,
    expiresAt: -9n,
  });
  assert.equal(register.data.length, 25);
  assert.equal(register.data[0], 0);
  assert.equal(register.data.readBigUInt64LE(1), 7n);
  assert.equal(register.data.readBigUInt64LE(9), 50n);
  assert.equal(register.data.readBigInt64LE(17), -9n);

  const line = buildOpenLineInstruction({
    authority,
    pool,
    policy,
    agent,
    limit: 1_000n,
  });
  assert.equal(line.data.length, 9);
  assert.equal(line.data[0], 2);
  assert.equal(line.data.readBigUInt64LE(1), 1_000n);
  assert.deepEqual(
    line.keys.map((key) => key.pubkey.toBase58()),
    [authority, pool, policy, agent, findLinePda(pool, agent)].map((key) => key.toBase58()),
  );

  const revoke = buildRevokeInstruction({ issuer: authority, policy });
  assert.deepEqual([...revoke.data], [2]);
});

test("deposit builder includes the optional token transfer accounts together", () => {
  const authority = Keypair.generate().publicKey;
  const pool = Keypair.generate().publicKey;
  const sourceAta = Keypair.generate().publicKey;
  const vaultAta = Keypair.generate().publicKey;
  const accountingOnly = buildDepositInstruction({ authority, pool, amount: 2n });
  assert.equal(accountingOnly.keys.length, 2);
  assert.equal(accountingOnly.data.readBigUInt64LE(1), 2n);

  const withTransfer = buildDepositInstruction({
    authority,
    pool,
    amount: 2n,
    sourceAta,
    vaultAta,
  });
  assert.equal(withTransfer.keys.length, 5);
  assert.throws(
    () => buildDepositInstruction({ authority, pool, amount: 2n, sourceAta }),
    /provided together/,
  );
});

test("builders reject values that cannot be represented on-chain", () => {
  const authority = Keypair.generate().publicKey;
  const pool = Keypair.generate().publicKey;
  assert.throws(
    () => buildDepositInstruction({ authority, pool, amount: 1n << 64n }),
    /64-bit/,
  );
  assert.throws(
    () => findPolicyPda(authority, -1n),
    /64-bit/,
  );
});

test("draw keeps the pool PDA unsigned in the outer transaction", () => {
  const agent = Keypair.generate().publicKey;
  const pool = Keypair.generate().publicKey;
  const plan = planVaultDrawOpen({
    agent,
    pool,
    line: Keypair.generate().publicKey,
    policy: Keypair.generate().publicKey,
    payer: pool,
    payerTokenAccount: Keypair.generate().publicKey,
    payee: Keypair.generate().publicKey,
    mint: Keypair.generate().publicKey,
    rentPayer: agent,
    draw: {
      amount: 10n,
      salt: 1n,
      gracePeriod: 60,
      openSlot: 100n,
    },
  });

  // 0..6 are draw core, 7 is Channels program, 8..21 are open accounts.
  assert.equal(plan.instruction.keys[8]?.pubkey.toBase58(), pool.toBase58());
  assert.equal(plan.instruction.keys[8]?.isSigner, false);
  assert.equal(plan.instruction.keys[9]?.pubkey.toBase58(), agent.toBase58());
  assert.equal(plan.instruction.keys[9]?.isSigner, true);
});

test("draw refuses a token payer that is not the pool PDA", () => {
  const pool = Keypair.generate().publicKey;
  assert.throws(
    () => planVaultDrawOpen({
      agent: Keypair.generate().publicKey,
      pool,
      line: Keypair.generate().publicKey,
      policy: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      payerTokenAccount: Keypair.generate().publicKey,
      payee: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
      rentPayer: Keypair.generate().publicKey,
      draw: { amount: 1n, salt: 1n, gracePeriod: 1, openSlot: 1n },
    }),
    /payer to equal the pool PDA/,
  );
});
