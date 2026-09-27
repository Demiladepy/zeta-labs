import assert from "node:assert/strict";
import test from "node:test";
import {
  Denial,
  PolicyDeniedError,
  asPolicyDeniedError,
  policyDenialFromError,
} from "../src/index.js";

test("maps every on-chain policy error to a typed denial", () => {
  const cases = [
    [101, Denial.Revoked],
    [102, Denial.Expired],
    [103, Denial.PerCallCap],
    [104, Denial.RollingCap],
    [105, Denial.TotalCap],
    [106, Denial.NotAllowlisted],
  ] as const;

  for (const [programCode, denial] of cases) {
    assert.equal(
      policyDenialFromError({ InstructionError: [0, { Custom: programCode }] }),
      denial,
    );
  }
});

test("maps RPC simulation messages and keeps the transaction signature", () => {
  const denied = asPolicyDeniedError(
    new Error("Transaction simulation failed: custom program error: 0x67"),
    "example-signature",
  );

  assert.ok(denied instanceof PolicyDeniedError);
  assert.equal(denied.denial, Denial.PerCallCap);
  assert.equal(denied.programErrorCode, 103);
  assert.equal(denied.signature, "example-signature");
  assert.match(denied.message, /per-call cap/);
});

test("does not relabel unrelated transaction failures", () => {
  assert.equal(policyDenialFromError({ InstructionError: [0, { Custom: 7 }] }), undefined);
  assert.equal(policyDenialFromError(new Error("network unavailable")), undefined);
});
