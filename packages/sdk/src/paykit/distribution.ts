import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { concatBytes, writeU16LE, writeU32LE } from "./bytes.js";

/** One explicit split entry in the Payment Channels `open` preimage. */
export type DistributionRecipient = {
  recipient: PublicKey;
  /** Basis points out of 10_000. */
  bps: number;
};

/**
 * Canonical distribution preimage:
 * `count(u32 LE) ‖ [recipient(32) ‖ bps(u16 LE)]…`
 *
 * Empty list means 100% implicit remainder to `payee` (self-facilitating x402).
 */
export function encodeDistributionPreimage(
  recipients: readonly DistributionRecipient[],
): Uint8Array {
  if (recipients.some((r) => !Number.isInteger(r.bps) || r.bps < 0 || r.bps > 10_000)) {
    throw new Error("distribution bps must be an integer in [0, 10000]");
  }
  const totalBps = recipients.reduce((total, entry) => total + entry.bps, 0);
  if (totalBps > 10_000) {
    throw new Error("distribution bps total must not exceed 10000");
  }
  const out = new Uint8Array(4 + recipients.length * 34);
  writeU32LE(out, 0, recipients.length);
  let offset = 4;
  for (const entry of recipients) {
    out.set(entry.recipient.toBytes(), offset);
    offset += 32;
    writeU16LE(out, offset, entry.bps);
    offset += 2;
  }
  return out;
}

/** SHA-256 commitment stored on-chain at `open`. */
export function hashDistributionPreimage(preimage: Uint8Array): Uint8Array {
  return createHash("sha256").update(preimage).digest();
}

/** Self-facilitating operator: no explicit splits; payee gets the remainder. */
export function selfFacilitatingDistribution(): Uint8Array {
  return encodeDistributionPreimage([]);
}
