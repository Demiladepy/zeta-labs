import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, it } from "node:test";
import { PolicyDeniedError } from "../src/errors.js";
import { planSevenStepSpend } from "../src/spend-plan.js";
import { Denial, DEVNET_USDC } from "../src/types.js";

describe("planSevenStepSpend", () => {
  it("builds lender setup, draw, settle, and repay steps", () => {
    const lender = Keypair.generate().publicKey;
    const agent = Keypair.generate().publicKey;
    const operator = Keypair.generate().publicKey;

    const plan = planSevenStepSpend({
      lender,
      agent,
      operator,
      mint: new PublicKey(DEVNET_USDC),
      policySeed: 42n,
      perCallCap: 1_000_000n,
      expiresAt: 4_000_000_000n,
      lineLimit: 5_000_000n,
      depositAmount: 10_000_000n,
      drawAmount: 1_000_000n,
      openSlot: 250_000_000n,
      settledEstimate: 100_000n,
      x402Endpoint: "http://127.0.0.1:3000/api/v1/summarize",
    });

    assert.equal(plan.steps.length, 10);
    assert.equal(plan.steps.find((s) => s.name === "draw_open_channel")?.instruction?.keys.length, 22);
    assert.equal(plan.draw.amount, plan.x402.maxAmount);
    assert.ok(plan.accounts.pool);
    assert.ok(plan.accounts.channel);
  });

  it("rejects draw above per-call cap", () => {
    assert.throws(
      () => planSevenStepSpend({
        lender: Keypair.generate().publicKey,
        agent: Keypair.generate().publicKey,
        operator: Keypair.generate().publicKey,
        policySeed: 1n,
        perCallCap: 100n,
        expiresAt: 1n,
        lineLimit: 1_000n,
        depositAmount: 1_000n,
        drawAmount: 200n,
        openSlot: 1n,
        settledEstimate: 50n,
        x402Endpoint: "http://example.test",
      }),
      (error) => error instanceof PolicyDeniedError && error.denial === Denial.PerCallCap,
    );
  });
});
