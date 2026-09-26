/**
 * The only Zeta account/event decoder. Keep this byte-for-byte aligned with
 * crates/zeta-interface/src/accounts.rs; UI code must import these helpers.
 */
import {
  ACCOUNT_DISCRIMINATOR,
  AUDIT_RECORD_LEN,
  CREDIT_LINE_LEN,
  Denial,
  LINE_USAGE_LEN,
  POLICY_ACL_LEN,
  POLICY_ACL_MAX_RECIPIENTS,
  POLICY_LEN,
  POOL_LEN,
  type AuditRecord,
  type CreditLine,
  type LineUsage,
  type Policy,
  type PolicyAcl,
  type Pool,
} from "./types.js";

export class ZetaDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZetaDecodeError";
  }
}

function viewFor(kind: string, data: Uint8Array, expectedLength: number): DataView {
  if (data.byteLength !== expectedLength) {
    throw new ZetaDecodeError(
      `${kind} must be exactly ${expectedLength} bytes; received ${data.byteLength}`,
    );
  }
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function discriminator(
  kind: string,
  view: DataView,
  expected: bigint,
): bigint {
  const actual = view.getBigUint64(0, true);
  if (actual !== expected) {
    throw new ZetaDecodeError(`${kind} has an invalid discriminator`);
  }
  return actual;
}

function bytes(data: Uint8Array, start: number, end: number): Uint8Array {
  return data.slice(start, end);
}

function bool(kind: string, value: number): boolean {
  if (value !== 0 && value !== 1) {
    throw new ZetaDecodeError(`${kind} must be encoded as 0 or 1`);
  }
  return value === 1;
}

function denial(value: number): Denial {
  if (value < Denial.Allow || value > Denial.NotAllowlisted) {
    throw new ZetaDecodeError(`unknown denial code: ${value}`);
  }
  return value as Denial;
}

export function decodePool(data: Uint8Array): Pool {
  const view = viewFor("Pool", data, POOL_LEN);
  return {
    discriminator: discriminator("Pool", view, ACCOUNT_DISCRIMINATOR.pool),
    authority: bytes(data, 8, 40),
    mint: bytes(data, 40, 72),
    vaultAta: bytes(data, 72, 104),
    deposited: view.getBigUint64(104, true),
    outstanding: view.getBigUint64(112, true),
    bump: view.getUint8(120),
  };
}

export function decodeLine(data: Uint8Array): CreditLine {
  const view = viewFor("CreditLine", data, CREDIT_LINE_LEN);
  return {
    discriminator: discriminator("CreditLine", view, ACCOUNT_DISCRIMINATOR.line),
    pool: bytes(data, 8, 40),
    agent: bytes(data, 40, 72),
    policy: bytes(data, 72, 104),
    limit: view.getBigUint64(104, true),
    drawn: view.getBigUint64(112, true),
    reserved: view.getBigUint64(120, true),
    bump: view.getUint8(128),
  };
}

export function decodePolicy(data: Uint8Array): Policy {
  const view = viewFor("Policy", data, POLICY_LEN);
  return {
    discriminator: discriminator("Policy", view, ACCOUNT_DISCRIMINATOR.policy),
    issuer: bytes(data, 8, 40),
    seed: view.getBigUint64(40, true),
    perCallCap: view.getBigUint64(48, true),
    expiresAt: view.getBigInt64(56, true),
    rollingCap: view.getBigUint64(64, true),
    totalCap: view.getBigUint64(72, true),
    aclVersion: view.getUint16(80, true),
    revoked: bool("Policy.revoked", view.getUint8(82)),
    bump: view.getUint8(83),
    rollingWindowSecs: view.getUint32(84, true),
  };
}

export function decodePolicyAcl(data: Uint8Array): PolicyAcl {
  const view = viewFor("PolicyAcl", data, POLICY_ACL_LEN);
  const recipientCount = view.getUint8(44);
  if (recipientCount > POLICY_ACL_MAX_RECIPIENTS) {
    throw new ZetaDecodeError("PolicyAcl.recipientCount out of range");
  }
  const recipients: Uint8Array[] = [];
  for (let i = 0; i < POLICY_ACL_MAX_RECIPIENTS; i++) {
    recipients.push(bytes(data, 48 + i * 32, 80 + i * 32));
  }
  return {
    discriminator: discriminator("PolicyAcl", view, ACCOUNT_DISCRIMINATOR.policyAcl),
    policy: bytes(data, 8, 40),
    categoryMask: view.getUint32(40, true),
    recipientCount,
    bump: view.getUint8(45),
    recipients,
  };
}

export function decodeLineUsage(data: Uint8Array): LineUsage {
  const view = viewFor("LineUsage", data, LINE_USAGE_LEN);
  return {
    discriminator: discriminator("LineUsage", view, ACCOUNT_DISCRIMINATOR.lineUsage),
    line: bytes(data, 8, 40),
    windowStart: view.getBigInt64(40, true),
    rollingSpent: view.getBigUint64(48, true),
    bump: view.getUint8(56),
  };
}

/** Decode the 136-byte payload emitted through Solana's `sol_log_data`. */
export function decodeAudit(data: Uint8Array): AuditRecord {
  const view = viewFor("AuditRecord", data, AUDIT_RECORD_LEN);
  const result = {
    discriminator: discriminator("AuditRecord", view, ACCOUNT_DISCRIMINATOR.audit),
    policy: bytes(data, 8, 40),
    line: bytes(data, 40, 72),
    agent: bytes(data, 72, 104),
    amount: view.getBigUint64(104, true),
    allowed: bool("AuditRecord.allowed", view.getUint8(112)),
    denial: denial(view.getUint8(113)),
    slot: view.getBigUint64(120, true),
    unixTs: view.getBigInt64(128, true),
  } satisfies AuditRecord;

  if (result.allowed !== (result.denial === Denial.Allow)) {
    throw new ZetaDecodeError("AuditRecord allowed flag disagrees with denial code");
  }
  return result;
}

function decodeBase64(value: string): Uint8Array {
  const browserAtob = (globalThis as typeof globalThis & {
    atob?: (input: string) => string;
  }).atob;
  if (!browserAtob) throw new Error("This runtime does not provide base64 decoding");
  const binary = browserAtob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Decode every Zeta AuditRecord emitted in a transaction's log messages. */
export function decodeAuditLogs(
  logs: readonly string[] | null | undefined,
): AuditRecord[] {
  if (!logs) return [];
  const prefix = "Program data: ";
  const records: AuditRecord[] = [];
  for (const log of logs) {
    if (!log.startsWith(prefix)) continue;
    try {
      const data = decodeBase64(log.slice(prefix.length));
      if (data.length === AUDIT_RECORD_LEN) records.push(decodeAudit(data));
    } catch {
      // Other programs may emit data in the same transaction; ignore it.
    }
  }
  return records;
}
