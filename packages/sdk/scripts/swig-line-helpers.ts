import type { Connection, PublicKey } from "@solana/web3.js";
import { decodePolicy } from "../src/decoder.js";
import { findPolicyPda } from "../src/instructions.js";

async function policyAtSeed(
  connection: Connection,
  issuer: PublicKey,
  seed: bigint,
): Promise<{ policy: PublicKey; revoked: boolean; exists: boolean }> {
  const policy = findPolicyPda(issuer, seed);
  const info = await connection.getAccountInfo(policy);
  if (!info) return { policy, revoked: false, exists: false };
  return { policy, revoked: decodePolicy(info.data).revoked, exists: true };
}

export async function firstUnregisteredPolicySeed(
  connection: Connection,
  issuer: PublicKey,
  start = 1n,
): Promise<bigint> {
  for (let seed = start; seed <= 64n; seed++) {
    const { exists } = await policyAtSeed(connection, issuer, seed);
    if (!exists) return seed;
  }
  throw new Error("no free policy seed (1..64)");
}
