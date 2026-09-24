/**
 * Self-check without TypeScript loader quirks.
 * Run: node packages/sdk/scripts/check-decode.mjs
 */

const POOL_LEN = 128;
const POLICY_LEN = 96;
const DISC_POOL = 0x5a455441504f4f4cn;
const DISC_POLICY = 0x5a455441504f4c59n;

function packPool(p) {
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

function decodePool(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const discriminator = view.getBigUint64(0, true);
  if (discriminator !== DISC_POOL) throw new Error("bad pool disc");
  return {
    deposited: view.getBigUint64(104, true),
    outstanding: view.getBigUint64(112, true),
    bump: data[120],
    authority0: data[8],
  };
}

function packPolicy(p) {
  const out = new Uint8Array(POLICY_LEN);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, p.discriminator, true);
  out.set(p.issuer, 8);
  view.setBigUint64(40, p.seed, true);
  view.setBigUint64(48, p.perCallCap, true);
  view.setBigInt64(56, p.expiresAt, true);
  out[82] = p.revoked ? 1 : 0;
  out[83] = p.bump;
  return out;
}

function decodePolicy(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getBigUint64(0, true) !== DISC_POLICY) throw new Error("bad policy disc");
  return {
    seed: view.getBigUint64(40, true),
    perCallCap: view.getBigUint64(48, true),
    revoked: data[82] !== 0,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const packed = packPool({
  discriminator: DISC_POOL,
  authority: new Uint8Array(32).fill(1),
  mint: new Uint8Array(32).fill(2),
  vaultAta: new Uint8Array(32).fill(3),
  deposited: 10_000n,
  outstanding: 400n,
  bump: 255,
});
assert(packed.length === 128, "pool len");
const d = decodePool(packed);
assert(d.deposited === 10_000n, "deposited");
assert(d.outstanding === 400n, "outstanding");
assert(d.bump === 255, "bump");
assert(d.authority0 === 1, "authority");

const pp = packPolicy({
  discriminator: DISC_POLICY,
  issuer: new Uint8Array(32).fill(7),
  seed: 99n,
  perCallCap: 500n,
  expiresAt: 1_700_000_000n,
  revoked: false,
  bump: 253,
});
assert(pp.length === 96, "policy len");
const pd = decodePolicy(pp);
assert(pd.perCallCap === 500n, "cap");
assert(pd.seed === 99n, "seed");
assert(pd.revoked === false, "revoked");

console.log("decode check ok");
