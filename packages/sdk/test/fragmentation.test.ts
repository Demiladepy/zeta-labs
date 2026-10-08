import assert from "node:assert/strict";
import test from "node:test";
import {
  Denial,
  applyDraw,
  buildFragmentationAttack,
  effectiveSpent,
  evaluateOffline,
  simulateSpendSequence,
  type PolicyLimits,
} from "../src/index.js";

/**
 * These mirror `crates/zeta-interface/tests/invariants.rs::fragmentation`.
 * If a case here diverges from the Rust, the TS mirror has drifted from the
 * frozen on-chain body and the SDK is lying to its callers.
 */

function limits(overrides: Partial<PolicyLimits> = {}): PolicyLimits {
  return {
    perCallCap: 1_000n,
    expiresAt: 0n,
    rollingCap: 0n,
    rollingWindowSecs: 0,
    totalCap: 0n,
    aclVersion: 0,
    revoked: false,
    ...overrides,
  };
}

test("accumulator mirrors LineUsage effective_spent and apply_draw", () => {
  const usage = { windowStart: 1_000n, rollingSpent: 40n };
  assert.equal(effectiveSpent(usage, 1_059n, 60), 40n);
  assert.equal(effectiveSpent(usage, 1_060n, 60), 0n, "exact boundary resets");

  const next = applyDraw(usage, 10n, 1_060n, 60);
  assert.equal(next.windowStart, 1_060n);
  assert.equal(next.rollingSpent, 10n, "reset then add");
});

test("ordered checks: revoked beats expiry beats per-call cap", () => {
  const usage = { windowStart: 0n, rollingSpent: 0n };
  assert.equal(
    evaluateOffline(limits({ revoked: true, expiresAt: 10n }), {
      amount: 99_999n,
      nowUnix: 50n,
      usage,
    }),
    Denial.Revoked,
  );
  assert.equal(
    evaluateOffline(limits({ perCallCap: 1n, expiresAt: 10n }), {
      amount: 99n,
      nowUnix: 10n,
      usage,
    }),
    Denial.Expired,
  );
});

test("per-call cap alone does not bound a fragmented drain", () => {
  // The attack the SoK describes: every call legal, the sequence is not.
  const policy = limits({ perCallCap: 100n });
  const attempts = buildFragmentationAttack({
    perCallCap: 100n,
    target: 10_000n,
    startAt: 1_000n,
  });
  const result = simulateSpendSequence(policy, attempts);
  assert.equal(result.deniedCount, 0, "every fragmented call passes");
  assert.equal(result.admitted, 10_000n, "100x the per-call ceiling drained");
});

test("rolling cap bounds every decomposition inside one window", () => {
  const policy = limits({
    perCallCap: 1_000n,
    rollingCap: 500n,
    rollingWindowSecs: 3_600,
  });

  // Sweep chunk sizes an attacker could legally choose.
  for (let chunk = 1n; chunk <= policy.perCallCap; chunk += 7n) {
    const attempts = Array.from({ length: 64 }, (_, k) => ({
      amount: chunk,
      at: 1_000n + BigInt(k),
    }));
    const result = simulateSpendSequence(policy, attempts);
    assert.ok(
      result.admitted <= policy.rollingCap,
      `chunk ${chunk}: admitted ${result.admitted} > cap ${policy.rollingCap}`,
    );
  }
});

test("tumbling boundary burst is bounded by exactly two caps", () => {
  // Honest limit: tumbling is not sliding. Two caps across a boundary, never more.
  const policy = limits({
    perCallCap: 1_000n,
    rollingCap: 500n,
    rollingWindowSecs: 3_600,
  });
  const result = simulateSpendSequence(policy, [
    { amount: 500n, at: 1_000n },
    { amount: 500n, at: 1_000n + 3_599n },
    { amount: 500n, at: 1_000n + 3_600n },
  ]);
  assert.equal(result.deniedCount, 1);
  assert.equal(result.admitted, 2n * policy.rollingCap);
});

test("sustained timing manipulation is bounded by windows elapsed", () => {
  const policy = limits({
    perCallCap: 1_000n,
    rollingCap: 500n,
    rollingWindowSecs: 600,
  });
  const windows = 10n;
  const attempts = [];
  for (let w = 0n; w < windows; w += 1n) {
    const at = 1_000n + w * 600n;
    for (let i = 0; i < 8; i += 1) attempts.push({ amount: 200n, at });
  }
  const result = simulateSpendSequence(policy, attempts);
  assert.ok(result.admitted <= windows * policy.rollingCap);
  assert.ok(result.deniedCount > 0, "the accumulator must actually bite");
  assert.equal(result.windowsTouched, Number(windows));
});

test("total cap bounds the sequence even when the window resets", () => {
  const policy = limits({
    perCallCap: 1_000n,
    rollingCap: 500n,
    rollingWindowSecs: 60,
    totalCap: 900n,
  });
  // Far enough apart that the rolling window resets every time.
  const attempts = Array.from({ length: 10 }, (_, k) => ({
    amount: 500n,
    at: 1_000n + BigInt(k) * 600n,
  }));
  const result = simulateSpendSequence(policy, attempts);
  assert.ok(
    result.admitted <= policy.totalCap,
    `admitted ${result.admitted} exceeded lifetime cap ${policy.totalCap}`,
  );
  assert.ok(result.deniedCount > 0);
});
