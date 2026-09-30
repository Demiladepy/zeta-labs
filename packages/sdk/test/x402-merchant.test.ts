import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS,
  x402DrawAmountBaseUnits,
  x402IsMeteredUptoEndpoint,
  x402SettledEstimate,
} from "../src/x402-merchant.js";

describe("x402-merchant", () => {
  it("uses playground summarize cap when x402 is live", () => {
    const ep = "http://127.0.0.1:3000/api/v1/summarize";
    assert.equal(x402DrawAmountBaseUnits(ep, false), PLAYGROUND_SUMMARIZE_CAP_BASE_UNITS);
    assert.equal(x402DrawAmountBaseUnits(ep, true), 1_000_000n);
  });

  it("detects metered upto endpoints", () => {
    assert.equal(x402IsMeteredUptoEndpoint("http://127.0.0.1:3000/api/v1/summarize"), true);
    assert.equal(x402IsMeteredUptoEndpoint("http://127.0.0.1:3000/api/v1/fortune"), false);
  });

  it("settled estimate is quarter of draw", () => {
    assert.equal(x402SettledEstimate(100_000n), 25_000n);
    assert.equal(x402SettledEstimate(1n), 1n);
  });
});
