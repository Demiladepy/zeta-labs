const U64_MAX = (1n << 64n) - 1n;
const I64_MIN = -(1n << 63n);
const I64_MAX = (1n << 63n) - 1n;

export function assertU64(name: string, value: bigint): void {
  if (value < 0n || value > U64_MAX) {
    throw new RangeError(`${name} must fit in an unsigned 64-bit integer`);
  }
}

export function assertI64(name: string, value: bigint): void {
  if (value < I64_MIN || value > I64_MAX) {
    throw new RangeError(`${name} must fit in a signed 64-bit integer`);
  }
}

export function assertU32(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError(`${name} must fit in an unsigned 32-bit integer`);
  }
}

export function assertU16(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${name} must fit in an unsigned 16-bit integer`);
  }
}

/** Write a u64 little-endian into `out` at `offset`. */
export function writeU64LE(out: Uint8Array, offset: number, value: bigint): void {
  assertU64("value", value);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setBigUint64(offset, value, true);
}

/** Write a u32 little-endian into `out` at `offset`. */
export function writeU32LE(out: Uint8Array, offset: number, value: number): void {
  assertU32("value", value);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(offset, value, true);
}

/** Write a u16 little-endian into `out` at `offset`. */
export function writeU16LE(out: Uint8Array, offset: number, value: number): void {
  assertU16("value", value);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint16(offset, value, true);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
