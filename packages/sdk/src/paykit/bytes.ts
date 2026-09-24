/** Write a u64 little-endian into `out` at `offset`. */
export function writeU64LE(out: Uint8Array, offset: number, value: bigint): void {
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setBigUint64(offset, value, true);
}

/** Write a u32 little-endian into `out` at `offset`. */
export function writeU32LE(out: Uint8Array, offset: number, value: number): void {
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(offset, value, true);
}

/** Write a u16 little-endian into `out` at `offset`. */
export function writeU16LE(out: Uint8Array, offset: number, value: number): void {
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
