/**
 * Offline mirror of the on-chain `evaluate` body and the `LineUsage`
 * accumulator, so a caller can test a whole spend *sequence* before sending
 * anything.
 *
 * Per-call caps bound one transaction. They do not bound a sequence. "SoK:
 * Blockchain Agent-to-Agent Payments" (arXiv:2604.03733) names this as an open
 * problem in deployed agent-payment systems:
 *
 *   "Authorization policies constrain individual transactions ... However, they
 *    do not capture the execution history, cumulative spend, or multi-step
 *    strategies. Therefore, sequences of valid transactions may violate
 *    intended spending boundaries through repetition, fragmentation, or timing
 *    manipulation."
 *
 * Zeta's windowed accumulator answers it. This module lets you prove that for
 * your own policy without spending a lamport.
 *
 * Mirrors `crates/zeta-interface/src/evaluate.rs` and
 * `LineUsage::{effective_spent, apply_draw}` in `accounts.rs`. If those change,
 * this changes with them — see `docs/INTERFACE.md`.
 */
import { Denial } from "./types.js";

/** Policy fields that participate in `evaluate`. Mirrors the frozen layout. */
export type PolicyLimits = {
  perCallCap: bigint;
  /** `0` = no expiry. */
  expiresAt: bigint;
  /** `0` = rolling accumulator disabled. */
  rollingCap: bigint;
  /** Required non-zero whenever `rollingCap != 0`. */
  rollingWindowSecs: number;
  /** `0` = total cap disabled. */
  totalCap: bigint;
  /** `0` = ACL disabled. */
  aclVersion?: number;
  revoked?: boolean;
};

/** Mutable accumulator state, mirroring the `LineUsage` PDA. */
export type UsageState = {
  /** `0` = window never started. */
  windowStart: bigint;
  rollingSpent: bigint;
};

/** One attempted draw in a sequence. */
export type SpendAttempt = {
  amount: bigint;
  /** Unix seconds. */
  at: bigint;
  /** Only consulted when the policy has `aclVersion != 0`. */
  aclAllows?: boolean;
};

export type AttemptOutcome = {
  index: number;
  amount: bigint;
  at: bigint;
  denial: Denial;
  allowed: boolean;
  /** Window spend used by this decision, after any tumbling reset. */
  effectiveSpent: bigint;
  /** Cumulative admitted total across the whole sequence. */
  admittedSoFar: bigint;
};

export type SequenceResult = {
  outcomes: AttemptOutcome[];
  /** Total value the policy actually let through. */
  admitted: bigint;
  /** Total value the attacker asked for. */
  attempted: bigint;
  deniedCount: number;
  /** Final accumulator state. */
  usage: UsageState;
  /** Distinct windows the sequence touched. */
  windowsTouched: number;
};

/** `LineUsage::effective_spent` — window spend after any tumbling reset. */
export function effectiveSpent(
  usage: UsageState,
  nowUnix: bigint,
  windowSecs: number,
): bigint {
  if (windowSecs === 0 || usage.windowStart === 0n) return 0n;
  if (nowUnix - usage.windowStart >= BigInt(windowSecs)) return 0n;
  return usage.rollingSpent;
}

/** `LineUsage::apply_draw` — reset if elapsed, then add. Call only on allow. */
export function applyDraw(
  usage: UsageState,
  amount: bigint,
  nowUnix: bigint,
  windowSecs: number,
): UsageState {
  if (windowSecs === 0) return usage;
  let { windowStart, rollingSpent } = usage;
  if (windowStart === 0n || nowUnix - windowStart >= BigInt(windowSecs)) {
    windowStart = nowUnix;
    rollingSpent = 0n;
  }
  return { windowStart, rollingSpent: rollingSpent + amount };
}

/**
 * Ordered policy checks, first failure wins. Mirrors `evaluate` exactly —
 * including the order, which is load-bearing (expiry is reported before a cap
 * breach, revocation before everything).
 */
export function evaluateOffline(
  policy: PolicyLimits,
  args: {
    amount: bigint;
    nowUnix: bigint;
    usage: UsageState;
    lineDrawn?: bigint;
    lineReserved?: bigint;
    aclAllows?: boolean;
  },
): Denial {
  if (policy.revoked) return Denial.Revoked;
  if (policy.expiresAt !== 0n && args.nowUnix >= policy.expiresAt) {
    return Denial.Expired;
  }
  if (args.amount === 0n || args.amount > policy.perCallCap) {
    return Denial.PerCallCap;
  }
  if (policy.rollingCap !== 0n) {
    if (policy.rollingWindowSecs === 0) return Denial.RollingCap;
    const spent = effectiveSpent(args.usage, args.nowUnix, policy.rollingWindowSecs);
    if (spent + args.amount > policy.rollingCap) return Denial.RollingCap;
  }
  if (policy.totalCap !== 0n) {
    const used = (args.lineDrawn ?? 0n) + (args.lineReserved ?? 0n);
    if (used + args.amount > policy.totalCap) return Denial.TotalCap;
  }
  if ((policy.aclVersion ?? 0) !== 0 && args.aclAllows !== true) {
    return Denial.NotAllowlisted;
  }
  return Denial.Allow;
}

/**
 * Replay a whole sequence of attempted draws against a policy, carrying the
 * accumulator forward exactly as the on-chain `draw` path does.
 *
 * Use it to answer: "if my agent splits this spend into N calls, how much
 * actually gets through?" With `rollingCap` set, the answer is bounded by
 * `rollingCap` per window regardless of how the attacker fragments.
 */
export function simulateSpendSequence(
  policy: PolicyLimits,
  attempts: SpendAttempt[],
  options: {
    usage?: UsageState;
    lineDrawn?: bigint;
    lineReserved?: bigint;
  } = {},
): SequenceResult {
  let usage: UsageState = options.usage ?? { windowStart: 0n, rollingSpent: 0n };
  let admitted = 0n;
  let attempted = 0n;
  let deniedCount = 0;
  const windowStarts = new Set<string>();
  const outcomes: AttemptOutcome[] = [];

  attempts.forEach((attempt, index) => {
    attempted += attempt.amount;
    const spent = effectiveSpent(usage, attempt.at, policy.rollingWindowSecs);
    const denial = evaluateOffline(policy, {
      amount: attempt.amount,
      nowUnix: attempt.at,
      usage,
      lineDrawn: (options.lineDrawn ?? 0n) + admitted,
      lineReserved: options.lineReserved,
      aclAllows: attempt.aclAllows,
    });
    const allowed = denial === Denial.Allow;
    if (allowed) {
      usage = applyDraw(usage, attempt.amount, attempt.at, policy.rollingWindowSecs);
      admitted += attempt.amount;
      windowStarts.add(usage.windowStart.toString());
    } else {
      deniedCount += 1;
    }
    outcomes.push({
      index,
      amount: attempt.amount,
      at: attempt.at,
      denial,
      allowed,
      effectiveSpent: spent,
      admittedSoFar: admitted,
    });
  });

  return {
    outcomes,
    admitted,
    attempted,
    deniedCount,
    usage,
    windowsTouched: windowStarts.size,
  };
}

/**
 * Build the canonical fragmentation attack: drain `target` by splitting it into
 * calls that each sit just under the per-call cap, fired `spacingSecs` apart.
 */
export function buildFragmentationAttack(params: {
  perCallCap: bigint;
  target: bigint;
  startAt: bigint;
  spacingSecs?: bigint;
}): SpendAttempt[] {
  const chunk = params.perCallCap;
  if (chunk <= 0n) throw new Error("perCallCap must be positive");
  const spacing = params.spacingSecs ?? 1n;
  const attempts: SpendAttempt[] = [];
  let remaining = params.target;
  let at = params.startAt;
  while (remaining > 0n) {
    const amount = remaining < chunk ? remaining : chunk;
    attempts.push({ amount, at });
    remaining -= amount;
    at += spacing;
  }
  return attempts;
}
