import { describe, expect, it } from "vitest";
import { Denial } from "@zeta/sdk/dashboard";
import { demoSnapshot, denialLabels, formatUsdc, shortAddress } from "./data.js";

describe("dashboard data", () => {
  it("keeps the demo credit line within its limit", () => {
    const snapshot = demoSnapshot();
    const remaining = snapshot.line.limit - snapshot.line.drawn - snapshot.line.reserved;

    expect(remaining).toBeGreaterThanOrEqual(0n);
    expect(snapshot.pool.deposited - snapshot.pool.outstanding).toBeGreaterThanOrEqual(0n);
  });

  it("includes both approved and denied audit examples", () => {
    const audits = demoSnapshot().audits;

    expect(audits.some((audit) => audit.allowed)).toBe(true);
    expect(audits.some((audit) => !audit.allowed)).toBe(true);
    expect(denialLabels[Denial.PerCallCap]).toBe("Per-call cap");
  });

  it("formats USDC amounts and addresses for people", () => {
    expect(formatUsdc(12_345_678n)).toBe("12.34");
    expect(shortAddress("1234567890abcdefghij")).toBe("123456...fghij");
  });
});
