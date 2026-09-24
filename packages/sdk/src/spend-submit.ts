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
    const info = await connection.getAccountInfo(new PublicKey(id));
    if (!info?.executable) missing.push(`${name} (${id})`);
  }
  if (missing.length > 0) {
    throw new Error(
      `Programs not deployed on this RPC:\n  - ${missing.join("\n  - ")}\n` +
        "Wait for Demilade BPF deploy, then run npm run devnet:preflight.",
    );
  }
}

async function ensureAta(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  submit: boolean,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const info = await connection.getAccountInfo(ata);
  if (info || !submit) return ata;

  const ix = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ata,
    owner,
    mint,
  );
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
  return ata;
}

async function sendStep(
  connection: Connection,
  signers: Keypair[],
  instructions: TransactionInstruction[],
  cluster: SpendSubmitConfig["cluster"],
): Promise<string> {
  const tx = new Transaction().add(...instructions);
  return sendAndConfirmTransaction(connection, tx, signers, {
    commitment: "confirmed",
  });
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

  const plan = planSevenStepSpend({ ...config.planParams, openSlot });
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

    const depositIx = stepByName(plan, "deposit");
    record(
      "deposit",
      await sendStep(connection, [lender], [depositIx], cluster),
    );

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
      recordSkip("open_line", "line already exists");
    }

    const evaluateIx = stepByName(plan, "evaluate");
    record(
      "evaluate",
      await sendStep(connection, [], [evaluateIx], cluster),
    );

    const drawIx = stepByName(plan, "draw_open_channel");
    record(
      "draw_open_channel",
      await sendStep(
        connection,
        signersFor([agent.publicKey.toBase58()]),
        [drawIx],
        cluster,
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
        signersFor([operator.publicKey.toBase58()]),
        [settleIx],
        cluster,
      ),
    );

    const distributeIx = stepByName(plan, "distribute");
    record(
      "distribute",
      await sendStep(connection, [operator], [distributeIx], cluster),
    );

    const repayIx = stepByName(plan, "repay");
    record(
      "repay",
      await sendStep(
        connection,
        signersFor([agent.publicKey.toBase58()]),
        [repayIx],
        cluster,
      ),
    );
  } catch (error) {
    if (error instanceof PdaAccountProvisioningRequiredError) {
      throw new Error(
        `${error.message}\n\n` +
          "PDA accounts must be allocated before create_pool / register_policy / open_line. " +
          "Coordinate with Demilade on the program-side provisioner, or pass a custom `provision` callback.",
      );
    }
    throw error;
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
