/**
 * Fragmentation attack demo — the safety story, made visible.
 *
 * Runs a drain attempt in which *every individual call is legal* under the
 * per-call cap, and shows the windowed accumulator stopping the sequence.
 *
 * Read-only. No keypairs, no transactions, no spend. Safe to run on camera.
 *
 *   npm run demo:fragmentation
 *   npm run demo:fragmentation -- --policy <PUBKEY>     # use a live devnet policy
 *   npm run demo:fragmentation -- --target 50 --cap 1
 *
 * To put real denials on-chain for the dashboard audit panel, use the existing
 * tested path instead:
 *
 *   npm run devnet:policy-demos -- --submit
 */
import { PublicKey } from "@solana/web3.js";
import { createResilientDevnetConnection } from "./devnet-connection.js";
import { loadDevnetEnv } from "./load-devnet-env.js";
import { decodePolicy } from "../src/decoder.js";
import {
  Denial,
  buildFragmentationAttack,
  simulateSpendSequence,
  type PolicyLimits,
} from "../src/index.js";

const USDC_DECIMALS = 6n;
const UNIT = 10n ** USDC_DECIMALS;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function usdc(base: bigint): string {
  const whole = base / UNIT;
  const frac = (base % UNIT).toString().padStart(Number(USDC_DECIMALS), "0").slice(0, 2);
  return `${whole}.${frac}`;
}

function denialName(d: Denial): string {
  return (
    { 0: "ALLOWED", 1: "REVOKED", 2: "EXPIRED", 3: "PER-CALL CAP", 4: "ROLLING CAP", 5: "TOTAL CAP", 6: "NOT ALLOWLISTED" }[
      d
    ] ?? String(d)
  );
}

/** Demo defaults, in USDC base units. Overridden by a live policy when given. */
function demoPolicy(): PolicyLimits {
  return {
    perCallCap: 1n * UNIT, // 1.00 USDC per call — looks harmless
    expiresAt: 0n,
    rollingCap: 5n * UNIT, // 5.00 USDC per hour — the real ceiling
    rollingWindowSecs: 3_600,
    totalCap: 0n,
    aclVersion: 0,
    revoked: false,
  };
}

async function loadLivePolicy(address: string): Promise<PolicyLimits> {
  const env = loadDevnetEnv();
  const { connection } = await createResilientDevnetConnection(env.rpcUrl);
  const info = await connection.getAccountInfo(new PublicKey(address), "confirmed");
  if (!info) throw new Error(`policy account not found on devnet: ${address}`);
  const p = decodePolicy(info.data);
  return {
    perCallCap: p.perCallCap,
    expiresAt: p.expiresAt,
    rollingCap: p.rollingCap,
    rollingWindowSecs: p.rollingWindowSecs,
    totalCap: p.totalCap,
    aclVersion: p.aclVersion,
    revoked: p.revoked,
  };
}

async function main() {
  const policyAddress = flag("policy");
  let policy = demoPolicy();
  let source = "demo policy (no chain read)";

  if (policyAddress) {
    policy = await loadLivePolicy(policyAddress);
    source = `live devnet policy ${policyAddress}`;
  }
  const capOverride = flag("cap");
  if (capOverride) policy.perCallCap = BigInt(Math.round(Number(capOverride) * 1e6));

  // Run the same attack against a per-call-cap-only policy — the industry
  // default, and the configuration the SoK describes as insufficient.
  if (process.argv.includes("--undefended")) {
    policy.rollingCap = 0n;
    policy.rollingWindowSecs = 0;
    source += "  [accumulator disabled]";
  }

  const targetArg = flag("target");
  const target = targetArg ? BigInt(Math.round(Number(targetArg) * 1e6)) : 20n * UNIT;

  console.log("");
  console.log("  ZETA — FRAGMENTATION ATTACK");
  console.log("  " + "=".repeat(58));
  console.log(`  policy source   : ${source}`);
  console.log(`  per-call cap    : ${usdc(policy.perCallCap)} USDC`);
  console.log(
    `  rolling cap     : ${
      policy.rollingCap === 0n
        ? "DISABLED  <-- sequence is unbounded"
        : `${usdc(policy.rollingCap)} USDC / ${policy.rollingWindowSecs}s`
    }`,
  );
  console.log(`  attacker target : ${usdc(target)} USDC`);
  console.log("");
  console.log("  A compromised agent will not ask for the whole amount at once.");
  console.log("  It asks many times, each request under the per-call cap.");
  console.log("");

  const attempts = buildFragmentationAttack({
    perCallCap: policy.perCallCap,
    target,
    startAt: 1_700_000_000n,
    spacingSecs: 30n,
  });

  const result = simulateSpendSequence(policy, attempts);

  console.log("  call   amount        verdict          cumulative admitted");
  console.log("  " + "-".repeat(58));
  let shownDenials = 0;
  for (const o of result.outcomes) {
    const isFirstDenial = !o.allowed && shownDenials === 0;
    if (!o.allowed) shownDenials += 1;
    // Keep the transcript short: every allow, the first few denials, then stop.
    if (!o.allowed && shownDenials > 3) continue;
    const mark = o.allowed ? " " : ">";
    console.log(
      `  ${mark}${String(o.index + 1).padStart(3)}   ${usdc(o.amount).padStart(8)} USDC  ${denialName(
        o.denial,
      ).padEnd(15)}  ${usdc(o.admittedSoFar).padStart(8)} USDC${
        isFirstDenial ? "   <-- stopped here" : ""
      }`,
    );
  }
  if (result.deniedCount > 3) {
    console.log(`  ...   ${result.deniedCount - 3} further calls denied identically`);
  }

  console.log("  " + "-".repeat(58));
  console.log(`  attempted : ${usdc(result.attempted)} USDC across ${attempts.length} legal calls`);
  console.log(`  admitted  : ${usdc(result.admitted)} USDC`);
  console.log(`  denied    : ${result.deniedCount} calls`);
  console.log("");

  if (policy.rollingCap === 0n) {
    console.log("  RESULT: the drain SUCCEEDED.");
    console.log("  Every call passed the per-call cap. The sequence was never checked.");
    console.log("  This is the failure mode described in arXiv:2604.03733 (SoK, 2026).");
  } else {
    const blocked = result.attempted - result.admitted;
    console.log(`  RESULT: the drain was STOPPED. ${usdc(blocked)} USDC never moved.`);
    console.log(
      `  The accumulator bounds admitted spend to ${usdc(policy.rollingCap)} USDC per window,`,
    );
    console.log("  no matter how the attacker splits the request.");
  }
  console.log("");
  console.log("  Proven in: crates/zeta-interface/tests/invariants.rs::fragmentation");
  console.log("             packages/sdk/test/fragmentation.test.ts");
  console.log("");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
