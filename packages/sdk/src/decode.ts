/**
 * One decoder for chain state. Dashboard must import these — do not fork.
 * Layout mirrors crates/zeta-interface pack/unpack (little-endian).
 */

import {
  ACCOUNT_DISCRIMINATOR,
  AUDIT_RECORD_LEN,
  CREDIT_LINE_LEN,
  Denial,
  POLICY_LEN,
  POOL_LEN,
  type AuditRecord,
  type CreditLine,
  type Policy,
  type Pool,
} from "./types.js";

function u64le(view: DataView, offset: number): bigint {
  return view.getBigUint64(offset, true);
}

function i64le(view: DataView, offset: number): bigint {
  return view.getBigInt64(offset, true);
}

function bytes(buf: Uint8Array, start: number, len: number): Uint8Array {
  return buf.slice(start, start + len);
}

export function decodePool(data: Uint8Array): Pool {
  if (data.length < POOL_LEN) throw new Error(`pool: need ${POOL_LEN} bytes`);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const discriminator = u64le(view, 0);
  if (discriminator !== ACCOUNT_DISCRIMINATOR.pool) {
    throw new Error("pool: bad discriminator");
  }
  return {
    discriminator,
    authority: bytes(data, 8, 32),
    mint: bytes(data, 40, 32),
    vaultAta: bytes(data, 72, 32),
    deposited: u64le(view, 104),
    outstanding: u64le(view, 112),
    bump: data[120]!,
  };
}

export function decodeCreditLine(data: Uint8Array): CreditLine {
  if (data.length < CREDIT_LINE_LEN) throw new Error(`line: need ${CREDIT_LINE_LEN} bytes`);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const discriminator = u64le(view, 0);
  if (discriminator !== ACCOUNT_DISCRIMINATOR.line) {
    throw new Error("line: bad discriminator");
  }
  return {
    discriminator,
    pool: bytes(data, 8, 32),
    agent: bytes(data, 40, 32),
    policy: bytes(data, 72, 32),
    limit: u64le(view, 104),
    drawn: u64le(view, 112),
    reserved: u64le(view, 120),
    bump: data[128]!,
  };
}

export function decodePolicy(data: Uint8Array): Policy {
  if (data.length < POLICY_LEN) throw new Error(`policy: need ${POLICY_LEN} bytes`);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const discriminator = u64le(view, 0);
  if (discriminator !== ACCOUNT_DISCRIMINATOR.policy) {
    throw new Error("policy: bad discriminator");
  }
  return {
    discriminator,
    issuer: bytes(data, 8, 32),
    seed: u64le(view, 40),
    perCallCap: u64le(view, 48),
    expiresAt: i64le(view, 56),
    rollingCap: u64le(view, 64),
    totalCap: u64le(view, 72),
    aclVersion: view.getUint16(80, true),
    revoked: data[82] !== 0,
    bump: data[83]!,
  };
}

export function decodeAuditRecord(data: Uint8Array): AuditRecord {
  if (data.length < AUDIT_RECORD_LEN) {
    throw new Error(`audit: need ${AUDIT_RECORD_LEN} bytes`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const discriminator = u64le(view, 0);
  if (discriminator !== ACCOUNT_DISCRIMINATOR.audit) {
    throw new Error("audit: bad discriminator");
  }
  const denialByte = data[113]!;
  return {
    discriminator,
    policy: bytes(data, 8, 32),
    line: bytes(data, 40, 32),
    agent: bytes(data, 72, 32),
    amount: u64le(view, 104),
    allowed: data[112] !== 0,
    denial: denialByte as Denial,
    slot: u64le(view, 120),
    unixTs: i64le(view, 128),
  };
}

/** Pack helpers for fixtures / unit checks (same wire as Rust). */
export function packPool(p: Pool): Uint8Array {
  const out = new Uint8Array(POOL_LEN);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, p.discriminator, true);
  out.set(p.authority, 8);
  out.set(p.mint, 40);
  out.set(p.vaultAta, 72);
  view.setBigUint64(104, p.deposited, true);
  view.setBigUint64(112, p.outstanding, true);
  out[120] = p.bump;
  return out;
}

export function packPolicy(p: Policy): Uint8Array {
  const out = new Uint8Array(POLICY_LEN);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, p.discriminator, true);
  out.set(p.issuer, 8);
  view.setBigUint64(40, p.seed, true);
  view.setBigUint64(48, p.perCallCap, true);
  view.setBigInt64(56, p.expiresAt, true);
  view.setBigUint64(64, p.rollingCap, true);
  view.setBigUint64(72, p.totalCap, true);
  view.setUint16(80, p.aclVersion, true);
  out[82] = p.revoked ? 1 : 0;
  out[83] = p.bump;
  return out;
}
