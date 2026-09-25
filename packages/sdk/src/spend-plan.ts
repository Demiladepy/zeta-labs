/**
 * Offline seven-step spend planner. Uses frozen program IDs and PDAs — no RPC
 * required. Submit each step after Demilade's devnet deploy lands.
 */
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  buildCreatePoolInstruction,
  buildDepositInstruction,
  buildEvaluateInstruction,
  buildOpenLineInstruction,
  buildRegisterPolicyInstruction,
  findLinePda,
  findPolicyPda,
  findPoolPda,
} from "./instructions.js";
import { OPEN_SLOT_WINDOW } from "./paykit/constants.js";
import { planVaultDrawOpen } from "./paykit/draw.js";
import { buildRepayInstruction } from "./paykit/instructions.js";
import { planOperatorSettle } from "./paykit/settle.js";
import {
  CREDIT_VAULT_PROGRAM_ID,
  DEVNET_USDC,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
} from "./types.js";

export type PlannedStep = {
  /** 1-based step in the seven-step demo. */
  step: number;
  name: string;
  signers: PublicKey[];
  /** Absent for off-chain steps (x402 HTTP). */
  instruction?: TransactionInstruction;
  note?: string;
};

export type SpendPlanAccounts = {
  lender: PublicKey;
  agent: PublicKey;
  operator: PublicKey;
  mint: PublicKey;
  pool: PublicKey;
  vaultAta: PublicKey;
  lenderAta: PublicKey;
  policy: PublicKey;
  line: PublicKey;
  channel: PublicKey;
  channelTokenAccount: PublicKey;
};

export type SevenStepSpendPlan = {
  programIds: {
    creditVault: PublicKey;
    policyRegistry: PublicKey;
    paymentChannels: PublicKey;
  };
  accounts: SpendPlanAccounts;
  draw: {
    amount: bigint;
    salt: bigint;
    gracePeriod: number;
    openSlot: bigint;
    settledEstimate: bigint;
  };
  x402: {
    endpoint: string;
    maxAmount: bigint;
  };
  steps: PlannedStep[];
};

export type PlanSevenStepSpendParams = {
  lender: PublicKey;
  agent: PublicKey;
  operator: PublicKey;
  mint?: PublicKey;
  /** Policy seed for PDA derivation. */
  policySeed: bigint;
  perCallCap: bigint;
  expiresAt: bigint;
  lineLimit: bigint;
  depositAmount: bigint;
  drawAmount: bigint;
  /** Must be current-or-recent at submit time (within OPEN_SLOT_WINDOW). */
  openSlot: bigint;
  salt?: bigint;
  gracePeriod?: number;
  /** Operator-reported metered amount for repay planning. */
  settledEstimate: bigint;
  /** When false, settle uses hasVoucher=false (on-chain-only / skip-x402 path). */
  metered?: boolean;
  x402Endpoint: string;
  creditVaultProgramId?: PublicKey;
  policyRegistryProgramId?: PublicKey;
  paymentChannelsProgramId?: PublicKey;
};

function ixStep(
  step: number,
  name: string,
  signers: PublicKey[],
  instruction?: TransactionInstruction,
  note?: string,
): PlannedStep {
  return { step, name, signers, instruction, note };
}

/**
 * Build the full Phase-1 instruction sequence:
 * lender setup → agent draw (+ channel open CPI) → (x402 off-chain) → operator settle → repay.
 */
export function planSevenStepSpend(params: PlanSevenStepSpendParams): SevenStepSpendPlan {
  const mint = params.mint ?? new PublicKey(DEVNET_USDC);
  const creditVault =
    params.creditVaultProgramId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID);
  const policyRegistry =
    params.policyRegistryProgramId ?? new PublicKey(POLICY_REGISTRY_PROGRAM_ID);
  const paymentChannels =
    params.paymentChannelsProgramId ?? new PublicKey(PAYMENT_CHANNELS_PROGRAM_ID);

  const pool = findPoolPda(params.lender, mint, creditVault);
  const vaultAta = getAssociatedTokenAddressSync(mint, pool, true);
  const lenderAta = getAssociatedTokenAddressSync(mint, params.lender);
  const policy = findPolicyPda(params.lender, params.policySeed, policyRegistry);
  const line = findLinePda(pool, params.agent, creditVault);

  const salt = params.salt ?? 1n;
  const gracePeriod = params.gracePeriod ?? 300;
  const draw = {
    amount: params.drawAmount,
    salt,
    gracePeriod,
    openSlot: params.openSlot,
  };

  if (params.drawAmount > params.perCallCap) {
    throw new Error("drawAmount exceeds perCallCap");
  }
  if (params.drawAmount > params.lineLimit) {
    throw new Error("drawAmount exceeds lineLimit");
  }
  if (params.settledEstimate > params.drawAmount) {
    throw new Error("settledEstimate cannot exceed drawAmount");
  }

  const drawPlan = planVaultDrawOpen({
    creditVaultProgramId: creditVault,
    paymentChannelsProgramId: paymentChannels,
    agent: params.agent,
    pool,
    line,
    policy,
    payer: pool,
    payerTokenAccount: vaultAta,
    payee: params.operator,
    mint,
    rentPayer: params.agent,
    draw,
  });

  const settlePlan = planOperatorSettle({
    paymentChannelsProgramId: paymentChannels,
    creditVaultProgramId: creditVault,
    channel: drawPlan.layout.channel,
    payer: pool,
    rentPayer: params.agent,
    payee: params.operator,
    mint,
    channelTokenAccount: drawPlan.layout.channelTokenAccount,
    payerTokenAccount: vaultAta,
    line,
    pool,
    repaySigner: params.agent,
    reservedThisDraw: params.drawAmount,
    settled: params.settledEstimate,
    hasVoucher: params.metered ?? true,
  });

  const steps: PlannedStep[] = [
    ixStep(
      1,
      "create_pool",
      [params.lender],
      buildCreatePoolInstruction({
        authority: params.lender,
        mint,
        pool,
        vaultAta,
        programId: creditVault,
      }),
      "Program allocates pool PDA via trailing SystemProgram (docs/PDA.md).",
    ),
    ixStep(
      2,
      "deposit",
      [params.lender],
      buildDepositInstruction({
        authority: params.lender,
        pool,
        amount: params.depositAmount,
        sourceAta: lenderAta,
        vaultAta,
        programId: creditVault,
      }),
    ),
    ixStep(
      3,
      "register_policy",
      [params.lender],
      buildRegisterPolicyInstruction({
        issuer: params.lender,
        seed: params.policySeed,
        perCallCap: params.perCallCap,
        expiresAt: params.expiresAt,
        policy,
        programId: policyRegistry,
      }),
      "Program allocates policy PDA via trailing SystemProgram (docs/PDA.md).",
    ),
    ixStep(
      4,
      "open_line",
      [params.lender],
      buildOpenLineInstruction({
        authority: params.lender,
        pool,
        policy,
        agent: params.agent,
        limit: params.lineLimit,
        line,
        programId: creditVault,
      }),
      "Program allocates line PDA via trailing SystemProgram (docs/PDA.md).",
    ),
    ixStep(
      5,
      "evaluate",
      [],
      buildEvaluateInstruction({
        policy,
        line,
        agent: params.agent,
        amount: params.drawAmount,
        recipient: params.operator,
        programId: policyRegistry,
      }),
      "Read-only policy check + audit log. Run before draw in the same or prior tx.",
    ),
    ixStep(
      6,
      "draw_open_channel",
      [params.agent],
      drawPlan.instruction,
      `Vault CPI opens Payment Channels. open_slot must be within ${OPEN_SLOT_WINDOW} slots of current slot.`,
    ),
    ixStep(
      7,
      "x402_upto",
      [params.agent],
      undefined,
      `Off-chain: POST/GET ${params.x402Endpoint} with maxAmount == ${params.drawAmount.toString()} base units.`,
    ),
    ixStep(
      8,
      "settle_and_seal",
      [params.operator],
      settlePlan.settleAndSeal,
      "Operator signs after metering. Bundle Ed25519 voucher precompile when hasVoucher=true.",
    ),
    ixStep(
      9,
      "distribute",
      [],
      settlePlan.distribute,
      "Permissionless crank after seal.",
    ),
    ixStep(
      10,
      "repay",
      [params.agent],
      settlePlan.repay,
      `Books settled=${params.settledEstimate.toString()}, releases unused reserve.`,
    ),
  ];

  return {
    programIds: {
      creditVault,
      policyRegistry,
      paymentChannels,
    },
    accounts: {
      lender: params.lender,
      agent: params.agent,
      operator: params.operator,
      mint,
      pool,
      vaultAta,
      lenderAta,
      policy,
      line,
      channel: drawPlan.layout.channel,
      channelTokenAccount: drawPlan.layout.channelTokenAccount,
    },
    draw: {
      amount: params.drawAmount,
      salt,
      gracePeriod,
      openSlot: params.openSlot,
      settledEstimate: params.settledEstimate,
    },
    x402: {
      endpoint: params.x402Endpoint,
      maxAmount: params.drawAmount,
    },
    steps,
  };
}

/** Pretty-print a plan for CLI / logs. */
export function formatSpendPlan(plan: SevenStepSpendPlan): string {
  const lines: string[] = [
    "=== Zeta seven-step spend plan (offline) ===",
    "",
    "Program IDs (frozen until deploy updates ids.rs):",
    `  Credit Vault:      ${plan.programIds.creditVault.toBase58()}`,
    `  Policy Registry:   ${plan.programIds.policyRegistry.toBase58()}`,
    `  Payment Channels:  ${plan.programIds.paymentChannels.toBase58()}`,
    "",
    "Accounts:",
    `  lender:    ${plan.accounts.lender.toBase58()}`,
    `  agent:     ${plan.accounts.agent.toBase58()}`,
    `  operator:  ${plan.accounts.operator.toBase58()}`,
    `  pool:      ${plan.accounts.pool.toBase58()}`,
    `  vaultAta:  ${plan.accounts.vaultAta.toBase58()}`,
    `  policy:    ${plan.accounts.policy.toBase58()}`,
    `  line:      ${plan.accounts.line.toBase58()}`,
    `  channel:   ${plan.accounts.channel.toBase58()}`,
    "",
    `Draw: ${plan.draw.amount.toString()} base units (open_slot=${plan.draw.openSlot.toString()})`,
    `x402: ${plan.x402.endpoint} (maxAmount == deposit)`,
    `Repay estimate: settled=${plan.draw.settledEstimate.toString()}`,
    "",
    "Steps:",
  ];

  for (const step of plan.steps) {
    const signers =
      step.signers.length === 0
        ? "none"
        : step.signers.map((s) => s.toBase58()).join(", ");
    const accounts = step.instruction ? `${step.instruction.keys.length} accounts` : "off-chain";
    lines.push(`  ${step.step}. ${step.name} — ${accounts}, signers: ${signers}`);
    if (step.note) lines.push(`     ${step.note}`);
  }

  lines.push("");
  lines.push("Submit with: npm run devnet:spend-submit -- --submit");
  return lines.join("\n");
}
