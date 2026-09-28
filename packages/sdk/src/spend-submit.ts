/**
 * Submit the Phase-1 seven-step spend path on devnet (or surfnet sandbox).
 */
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  PdaAccountProvisioningRequiredError,
  ZetaClient,
  type PdaAccountProvisioner,
} from "./client.js";
import { decodeLine, decodePool, decodePolicy } from "./decoder.js";
import { sendTransactionHttp, retryOn429 } from "./devnet-rpc.js";
import { fetchPaidEndpoint } from "./paykit/x402.js";
import {
  CREDIT_VAULT_PROGRAM_ID,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
  POLICY_LEN,
  POOL_LEN,
  CREDIT_LINE_LEN,
} from "./types.js";
import {
  assertAuthorityOwnsLine,
  drawSignerKeypair,
  lineAgentPubkey,
  spendAuthorityFromAgentKeypair,
  type SpendAuthority,
} from "./spend-authority.js";
import { fetchSwigForState, loadSwigLineGrantState, SwigNotConfiguredError } from "./swig/index.js";
import { buildSwigExecuteInstructions, buildSwigWrappedDrawSpec } from "./swig/wrap-draw.js";
import { swigSignInstructions } from "./swig/wallet.js";
import {
  formatSpendPlan,
  planSevenStepSpend,
  type PlanSevenStepSpendParams,
  type SevenStepSpendPlan,
} from "./spend-plan.js";

export type SpendSubmitConfig = {
  connection: Connection;
  lender: Keypair;
  agent: Keypair;
  operator: Keypair;
  planParams: PlanSevenStepSpendParams;
  /** When false, only builds and prints the plan. */
  submit: boolean;
  /** Skip the HTTP x402 step (on-chain only). */
  skipX402?: boolean;
  /** Optional body for metered `upto` POST endpoints. */
  x402Body?: string;
  /** x402 / pay-kit network slug. */
  network?: "devnet" | "localnet" | "mainnet";
  cluster?: "devnet" | "testnet" | "mainnet-beta";
  provision?: PdaAccountProvisioner;
};

export type StepResult = {
  name: string;
  signature?: string;
  explorerUrl?: string;
  skipped?: boolean;
  error?: string;
};

export type SpendSubmitResult = {
  plan: SevenStepSpendPlan;
  dryRun: boolean;
  steps: StepResult[];
};

function explorerUrl(signature: string, cluster: SpendSubmitConfig["cluster"]): string {
  const query = cluster === "mainnet-beta" ? "" : `?cluster=${cluster ?? "devnet"}`;
  return `https://explorer.solana.com/tx/${signature}${query}`;
}

async function assertProgramsDeployed(connection: Connection): Promise<void> {
  const ids = [
    ["Policy Registry", POLICY_REGISTRY_PROGRAM_ID],
    ["Credit Vault", CREDIT_VAULT_PROGRAM_ID],
    ["Payment Channels", PAYMENT_CHANNELS_PROGRAM_ID],
  ] as const;

  const missing: string[] = [];
  for (const [name, id] of ids) {
    let info = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        info = await connection.getAccountInfo(new PublicKey(id));
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("429") && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    if (!info?.executable) missing.push(`${name} (${id})`);
  }
  if (missing.length > 0) {
    throw new Error(
      `Programs not deployed on this RPC:\n  - ${missing.join("\n  - ")}\n` +
        "Wait for Demilade BPF deploy, then run npm run devnet:preflight.",
    );
  }
}

async function ensureSol(
  connection: Connection,
  payer: Keypair,
  recipient: PublicKey,
  minLamports = 100_000_000,
): Promise<void> {
  const balance = await connection.getBalance(recipient, "confirmed");
  if (balance >= minLamports) return;
  const needed = minLamports - balance;
  const ix = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient,
    lamports: needed,
  });
  await sendTransactionHttp(connection, payer, [ix]);
}

async function ensureAta(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  submit: boolean,
  allowOwnerOffCurve = false,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve);
  const info = await connection.getAccountInfo(ata);
  if (info || !submit) return ata;

  const ix = createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint);
  await sendTransactionHttp(connection, payer, [ix]);
  return ata;
}

async function sendStep(
  connection: Connection,
  feePayer: Keypair,
  signers: Keypair[],
  instructions: TransactionInstruction[],
): Promise<string> {
  const extraSigners = signers.filter(
    (s) => !s.publicKey.equals(feePayer.publicKey),
  );
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendTransactionHttp(connection, feePayer, instructions, extraSigners);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const expired = msg.includes("expired") || msg.includes("block height") || msg.includes("timeout");
      if (expired && attempt < MAX_RETRIES) {
        console.warn(`  tx expired — retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("unreachable");
}

function stepByName(plan: SevenStepSpendPlan, name: string) {
  const step = plan.steps.find((s) => s.name === name);
  if (!step?.instruction) {
    throw new Error(`missing on-chain step: ${name}`);
  }
  return step.instruction;
}

/**
 * Run lender setup → draw → optional x402 → operator settle → repay.
 */
export async function submitSevenStepSpend(
  config: SpendSubmitConfig,
): Promise<SpendSubmitResult> {
  const {
    connection,
    lender,
    agent,
    operator,
    submit,
    skipX402 = false,
    x402Body = "Zeta devnet spend metered request.",
    network = "devnet",
    cluster = "devnet",
  } = config;

  if (submit) {
    await assertProgramsDeployed(connection);
  }

  const openSlot = submit
    ? BigInt(await connection.getSlot("confirmed"))
    : config.planParams.openSlot;

  const plan = planSevenStepSpend({
    ...config.planParams,
    openSlot,
    metered: !skipX402,
  });
  const results: StepResult[] = [];

  if (!submit) {
    console.log(formatSpendPlan(plan));
    console.log("");
    console.log("Dry run only. Pass --submit to send transactions.");
    return { plan, dryRun: true, steps: results };
  }

  const zetaLender = new ZetaClient({
    connection,
    payer: lender,
    cluster,
  });
  const provision = config.provision;

  const signersFor = (names: string[]): Keypair[] => {
    const out: Keypair[] = [];
    if (names.includes(lender.publicKey.toBase58())) out.push(lender);
    if (names.includes(agent.publicKey.toBase58())) out.push(agent);
    if (names.includes(operator.publicKey.toBase58())) out.push(operator);
    return out;
  };

  const record = (name: string, signature: string) => {
    results.push({
      name,
      signature,
      explorerUrl: explorerUrl(signature, cluster),
    });
    console.log(`✓ ${name}: ${explorerUrl(signature, cluster)}`);
  };

  const recordSkip = (name: string, reason: string) => {
    results.push({ name, skipped: true, error: reason });
    console.log(`○ ${name}: skipped (${reason})`);
  };

  try {
    await ensureAta(connection, lender, plan.accounts.mint, lender.publicKey, true);
    await ensureAta(connection, lender, plan.accounts.mint, plan.accounts.operator, true, true);
    await ensureAta(connection, lender, plan.accounts.mint, plan.accounts.pool, true, true);
    await ensureSol(connection, lender, plan.accounts.operator);
    if (!agent.publicKey.equals(lender.publicKey)) {
      await ensureSol(connection, lender, agent.publicKey);
    }

    const poolInfo = await connection.getAccountInfo(plan.accounts.pool);
    if (!poolInfo) {
      const { signature } = await zetaLender.createPool({
        mint: plan.accounts.mint,
        provision,
      });
      record("create_pool", signature);
    } else {
      recordSkip("create_pool", "pool already exists");
    }

    const poolState = decodePool((await connection.getAccountInfo(plan.accounts.pool))!.data);
    if (poolState.deposited >= config.planParams.depositAmount) {
      recordSkip(
        "deposit",
        `pool already has ${poolState.deposited.toString()} base units deposited`,
      );
    } else {
      const depositIx = stepByName(plan, "deposit");
      record(
        "deposit",
        await sendStep(connection, lender, [lender], [depositIx]),
      );
    }

    const policyInfo = await connection.getAccountInfo(plan.accounts.policy);
    if (!policyInfo) {
      const { signature } = await zetaLender.registerPolicy({
        seed: config.planParams.policySeed,
        perCallCap: config.planParams.perCallCap,
        expiresAt: config.planParams.expiresAt,
        provision,
      });
      record("register_policy", signature);
    } else {
      const policyState = decodePolicy(policyInfo.data);
      if (policyState.revoked) {
        throw new Error(
          `policy ${plan.accounts.policy.toBase58()} is revoked. ` +
            "Re-run submit to auto-provision spend-agent + fresh policy seed.",
        );
      }
      recordSkip("register_policy", "policy already exists");
    }

    const lineInfo = await connection.getAccountInfo(plan.accounts.line);
    if (!lineInfo) {
      const { signature } = await zetaLender.openLine({
        pool: plan.accounts.pool,
        agent: plan.accounts.agent,
        policy: plan.accounts.policy,
        limit: config.planParams.lineLimit,
        provision,
      });
      record("open_line", signature);
    } else {
      const lineState = decodeLine(lineInfo.data);
      const linePolicy = new PublicKey(lineState.policy);
      if (!linePolicy.equals(plan.accounts.policy)) {
        throw new Error(
          `credit line ${plan.accounts.line.toBase58()} is bound to policy ${linePolicy.toBase58()}, ` +
            `but this plan uses ${plan.accounts.policy.toBase58()}. ` +
            "Re-run submit — resolve-spend-context should reuse the line policy.",
        );
      }
      recordSkip("open_line", "line already exists");
    }

    const evaluateIx = stepByName(plan, "evaluate");
    record(
      "evaluate",
      await sendStep(connection, lender, [], [evaluateIx]),
    );

    const drawIx = stepByName(plan, "draw_open_channel");
    record(
      "draw_open_channel",
      await sendStep(
        connection,
        agent,
        signersFor([agent.publicKey.toBase58()]),
        [drawIx],
      ),
    );

    if (!skipX402) {
      const { createKeyPairSignerFromBytes } = await import("@solana/kit");
      const signer = await createKeyPairSignerFromBytes(agent.secretKey);
      const endpoint = plan.x402.endpoint;
      const isPost = endpoint.includes("summarize");
      let x402Status = 0;
      let x402BodyText = "";

      if (isPost) {
        const payKitClient = await import("@solana/pay-kit/client");
        const client = await payKitClient.PayKitClient.builder()
          .signer(signer)
          .rpcUrl(connection.rpcEndpoint)
          .network(network)
          .permissions(false)
          .build();
        const response = await client.fetch(
          endpoint,
          { method: "POST", body: x402Body, headers: { "Content-Type": "text/plain" } },
          "x402",
        );
        x402Status = response.status;
        x402BodyText = await response.text();
      } else {
        const response = await fetchPaidEndpoint({
          endpoint,
          rpcUrl: connection.rpcEndpoint,
          network,
          signer,
          protocol: "x402",
        });
        x402Status = response.status;
        x402BodyText = response.body;
      }

      if (x402Status < 200 || x402Status >= 300) {
        throw new Error(`x402 failed (${x402Status}): ${x402BodyText.slice(0, 300)}`);
      }
      results.push({ name: "x402_upto", skipped: false });
      console.log(`✓ x402_upto: HTTP ${x402Status}`);
      console.log(`  body: ${x402BodyText.slice(0, 200)}`);
    } else {
      recordSkip("x402_upto", "--skip-x402");
    }

    const settleIx = stepByName(plan, "settle_and_seal");
    record(
      "settle_and_seal",
      await sendStep(
        connection,
        operator,
        signersFor([operator.publicKey.toBase58()]),
        [settleIx],
      ),
    );

    const distributeIx = stepByName(plan, "distribute");
    record(
      "distribute",
      await sendStep(connection, lender, [], [distributeIx]),
    );

    const repayIx = stepByName(plan, "repay");
    record(
      "repay",
      await sendStep(
        connection,
        agent,
        signersFor([agent.publicKey.toBase58()]),
        [repayIx],
      ),
    );
  } catch (error) {
    if (error instanceof PdaAccountProvisioningRequiredError) {
      throw new Error(
        `${error.message}\n\n` +
          "Builders append SystemProgram for program-side PDA allocation (docs/PDA.md). " +
          "Ensure devnet programs are upgraded to the PDA-capable build.",
      );
    }
    throw error;
  }

  return { plan, dryRun: false, steps: results };
}

export type AgentSpendConfig = {
  connection: Connection;
  /** Raw agent key; ignored when `authority` is set. */
  agent: Keypair;
  /** Phase 2: Swig delegate or explicit raw authority. */
  authority?: SpendAuthority;
  operator: Keypair;
  line: PublicKey;
  amount: bigint;
  endpoint: string;
  settledEstimate?: bigint;
  salt?: bigint;
  gracePeriod?: number;
  skipX402?: boolean;
  x402Body?: string;
  network?: "devnet" | "localnet" | "mainnet";
  cluster?: "devnet" | "testnet" | "mainnet-beta";
};

/**
 * Agent spend on an existing credit line: evaluate → draw → x402 → settle → repay.
 */
export async function submitAgentSpend(
  config: AgentSpendConfig,
): Promise<SpendSubmitResult> {
  const {
    connection,
    agent,
    operator,
    line: lineKey,
    amount,
    endpoint,
    skipX402 = false,
    x402Body = "Zeta agent spend metered request.",
    network = "devnet",
    cluster = "devnet",
  } = config;

  const authority = config.authority ?? spendAuthorityFromAgentKeypair(agent);
  const signingAgent = drawSignerKeypair(authority);
  const lineAgentKey = lineAgentPubkey(authority);

  await assertProgramsDeployed(connection);

  const lineAccount = await retryOn429(() => connection.getAccountInfo(lineKey));
  if (!lineAccount) throw new Error(`credit line not found: ${lineKey.toBase58()}`);

  const { decodeLine, decodePool, decodePolicy } = await import("./decoder.js");
  const line = decodeLine(lineAccount.data);
  const poolKey = new PublicKey(line.pool);
  const policyKey = new PublicKey(line.policy);
  const agentKey = new PublicKey(line.agent);

  assertAuthorityOwnsLine(agentKey, authority);

  const poolAccount = await retryOn429(() => connection.getAccountInfo(poolKey));
  if (!poolAccount) throw new Error(`pool not found: ${poolKey.toBase58()}`);
  const pool = decodePool(poolAccount.data);
  const mint = new PublicKey(pool.mint);

  const policyAccount = await retryOn429(() => connection.getAccountInfo(policyKey));
  if (!policyAccount) throw new Error(`policy not found: ${policyKey.toBase58()}`);
  const policy = decodePolicy(policyAccount.data);

  const lenderKey = new PublicKey(pool.authority);
  const openSlot = BigInt(await retryOn429(() => connection.getSlot("confirmed")));
  const settledEstimate = config.settledEstimate ?? amount / 4n;

  const plan = planSevenStepSpend({
    lender: lenderKey,
    agent: lineAgentKey,
    operator: operator.publicKey,
    mint,
    policySeed: policy.seed,
    perCallCap: policy.perCallCap,
    expiresAt: policy.expiresAt,
    lineLimit: line.limit,
    depositAmount: 0n,
    drawAmount: amount,
    openSlot,
    salt: config.salt,
    gracePeriod: config.gracePeriod,
    settledEstimate,
    metered: !skipX402,
    x402Endpoint: endpoint,
  });

  const results: StepResult[] = [];
  const signersFor = (names: string[]): Keypair[] => {
    const out: Keypair[] = [];
    const signerPk = signingAgent.publicKey.toBase58();
    if (names.includes(signerPk) || names.includes(lineAgentKey.toBase58())) {
      if (authority.kind === "raw-keypair") {
        out.push(signingAgent);
      }
    }
    if (names.includes(operator.publicKey.toBase58())) out.push(operator);
    return out;
  };

  const record = (name: string, signature: string) => {
    results.push({
      name,
      signature,
      explorerUrl: explorerUrl(signature, cluster),
    });
  };

  const evaluateIx = stepByName(plan, "evaluate");
  record("evaluate", await sendStep(connection, signingAgent, [], [evaluateIx]));

  const drawIx = stepByName(plan, "draw_open_channel");
  if (authority.kind === "swig-delegate") {
    const grant = loadSwigLineGrantState();
    if (!grant) throw new SwigNotConfiguredError();
    const swig = await fetchSwigForState(connection, grant);
    const spec = buildSwigWrappedDrawSpec(authority.swigWallet, drawIx);
    const signIxs = await buildSwigExecuteInstructions(swig, grant.delegateRoleId, spec);
    record(
      "draw_open_channel",
      await sendStep(connection, signingAgent, [signingAgent], signIxs),
    );
  } else {
    record(
      "draw_open_channel",
      await sendStep(
        connection,
        signingAgent,
        signersFor([lineAgentKey.toBase58()]),
        [drawIx],
      ),
    );
  }

  if (!skipX402) {
    const { createKeyPairSignerFromBytes } = await import("@solana/kit");
    const signer = await createKeyPairSignerFromBytes(signingAgent.secretKey);
    const isPost = endpoint.includes("summarize");
    let x402Status = 0;
    let x402BodyText = "";

    if (isPost) {
      const payKitClient = await import("@solana/pay-kit/client");
      const client = await payKitClient.PayKitClient.builder()
        .signer(signer)
        .rpcUrl(connection.rpcEndpoint)
        .network(network)
        .permissions(false)
        .build();
      const response = await client.fetch(
        endpoint,
        { method: "POST", body: x402Body, headers: { "Content-Type": "text/plain" } },
        "x402",
      );
      x402Status = response.status;
      x402BodyText = await response.text();
    } else {
      const response = await fetchPaidEndpoint({
        endpoint,
        rpcUrl: connection.rpcEndpoint,
        network,
        signer,
        protocol: "x402",
      });
      x402Status = response.status;
      x402BodyText = response.body;
    }

    if (x402Status < 200 || x402Status >= 300) {
      throw new Error(`x402 failed (${x402Status}): ${x402BodyText.slice(0, 300)}`);
    }
    results.push({ name: "x402_upto", skipped: false });
  }

  const settleIx = stepByName(plan, "settle_and_seal");
  record(
    "settle_and_seal",
    await sendStep(connection, operator, signersFor([operator.publicKey.toBase58()]), [settleIx]),
  );

  record("distribute", await sendStep(connection, signingAgent, [], [stepByName(plan, "distribute")]));
  const repayIx = stepByName(plan, "repay");
  if (authority.kind === "swig-delegate") {
    const grant = loadSwigLineGrantState();
    if (!grant) throw new SwigNotConfiguredError();
    const swig = await fetchSwigForState(connection, grant);
    const repaySignIxs = await swigSignInstructions(swig, grant.delegateRoleId, [repayIx]);
    record(
      "repay",
      await sendStep(connection, signingAgent, [signingAgent], repaySignIxs),
    );
  } else {
    record(
      "repay",
      await sendStep(
        connection,
        signingAgent,
        signersFor([lineAgentKey.toBase58()]),
        [repayIx],
      ),
    );
  }

  return { plan, dryRun: false, steps: results };
}

/** Rent-exempt createAccount helper for when a provisioner is approved. */
export function systemPdaProvisioner(connection: Connection, payer: Keypair): PdaAccountProvisioner {
  return async ({ address, owner, space }) => {
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    return SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: address,
      lamports,
      space,
      programId: owner,
    });
  };
}

export const PDA_SPACES = {
  pool: POOL_LEN,
  policy: POLICY_LEN,
  line: CREDIT_LINE_LEN,
} as const;
