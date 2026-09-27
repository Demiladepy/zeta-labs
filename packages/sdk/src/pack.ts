/** Wire packers used by fixtures and tests. Chain reads belong in decoder.ts. */
import {
  POLICY_LEN,
  POOL_LEN,
  type Policy,
  type Pool,
} from "./types.js";

export function packPool(pool: Pool): Uint8Array {
  const out = new Uint8Array(POOL_LEN);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, pool.discriminator, true);
  out.set(pool.authority, 8);
  out.set(pool.mint, 40);
  out.set(pool.vaultAta, 72);
  view.setBigUint64(104, pool.deposited, true);
  view.setBigUint64(112, pool.outstanding, true);
  out[120] = pool.bump;
  return out;
}

export function packPolicy(policy: Policy): Uint8Array {
  const out = new Uint8Array(POLICY_LEN);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, policy.discriminator, true);
  out.set(policy.issuer, 8);
  view.setBigUint64(40, policy.seed, true);
  view.setBigUint64(48, policy.perCallCap, true);
  view.setBigInt64(56, policy.expiresAt, true);
  view.setBigUint64(64, policy.rollingCap, true);
  view.setBigUint64(72, policy.totalCap, true);
  view.setUint16(80, policy.aclVersion, true);
  out[82] = policy.revoked ? 1 : 0;
  out[83] = policy.bump;
  view.setUint32(84, policy.rollingWindowSecs >>> 0, true);
  return out;
}
