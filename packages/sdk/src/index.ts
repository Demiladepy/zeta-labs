/**
 * Public SDK surface. Transaction submission requires a configured RPC/signer.
 * Names are frozen. Types come from ./types — do not fork layouts.
 */
import { PublicKey } from "@solana/web3.js";
import { createZetaClient, type ZetaClient, type ZetaClientConfig } from "./client.js";
import { Denial } from "./types.js";
import { submitAgentSpend } from "./spend-submit.js";

export {
  ACCOUNT_DISCRIMINATOR,
  AUDIT_RECORD_LEN,
  CREDIT_LINE_LEN,
  CREDIT_VAULT_PROGRAM_ID,
  Denial,
  DEVNET_USDC,
  INTERFACE_VERSION,
  LINE_USAGE_LEN,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_ACL_LEN,
  POLICY_ACL_MAX_RECIPIENTS,
  POLICY_IX,
  POLICY_LEN,
  POLICY_REGISTRY_PROGRAM_ID,
  POOL_LEN,
  VAULT_IX,
} from "./types.js";

export { ACCOUNT_ORDER, PDA_ALLOC } from "./accountOrder.js";

export {
  decodeAudit,
  decodeAuditLogs,
  decodeLine,
  decodeLineUsage,
  decodePolicy,
  decodePolicyAcl,
  decodePool,
  ZetaDecodeError,
} from "./decoder.js";

export { packPolicy, packPool } from "./pack.js";

export {
  PolicyDeniedError,
  asPolicyDeniedError,
  policyDenialFromError,
  policyDenialMessage,
  type PolicyDenial,
} from "./errors.js";

export {
  buildCreatePoolInstruction,
  buildDepositInstruction,
  buildEvaluateInstruction,
  buildOpenLineInstruction,
  buildRegisterPolicyInstruction,
  buildRevokeInstruction,
  buildSetAclInstruction,
  buildSetCapsInstruction,
  findAclPda,
  findLinePda,
  findPolicyPda,
  findPoolPda,
  findUsagePda,
} from "./instructions.js";

export {
  formatSpendPlan,
  planSevenStepSpend,
} from "./spend-plan.js";

export {
  PDA_SPACES,
  submitAgentSpend,
  submitSevenStepSpend,
  systemPdaProvisioner,
} from "./spend-submit.js";

export type {
  AgentSpendConfig,
  SpendSubmitConfig,
  SpendSubmitResult,
  StepResult,
} from "./spend-submit.js";

export type {
  PlanSevenStepSpendParams,
  PlannedStep,
  SevenStepSpendPlan,
  SpendPlanAccounts,
} from "./spend-plan.js";

export {
  createZetaClient,
  PdaAccountProvisioningRequiredError,
  ZetaClient,
} from "./client.js";

export type {
  PdaAccountRequest,
  PdaAccountProvisioner,
  TransactionProof,
  ZetaClientConfig,
} from "./client.js";

export * from "./paykit/index.js";

export {
  assertAuthorityOwnsLine,
  drawSignerKeypair,
  lineAgentPubkey,
  spendAuthorityFromAgentKeypair,
  type LineAgentPubkey,
  type RawKeySpendAuthority,
  type SpendAuthority,
  type SwigDelegateSpendAuthority,
} from "./spend-authority.js";

export {
  SwigNotConfiguredError,
  createSwigWalletForLineGrant,
  planSwigLineGrant,
  type SwigLineGrantPlan,
} from "./swig/index.js";

export {
  buildSwigExecuteInstructions,
  buildSwigWrappedDrawSpec,
  type SwigWrappedDrawSpec,
} from "./swig/wrap-draw.js";

export type {
  AuditRecord,
  CreditLine,
  DrawArgs,
  DrawChannelSpec,
  EvaluateArgs,
  LineUsage,
  Policy,
  PolicyAcl,
  Pool,
} from "./types.js";

export type Address = string;

export type CreatePoolParams = {
  authority: Address;
  mint: Address;
};

export type OpenLineParams = {
  pool: Address;
  agent: Address;
  policy: Address;
  limit: bigint;
};

export type SpendParams = {
  line: Address;
  amount: bigint;
  endpoint: string;
  /** Defaults to draw/4 when omitted. */
  settledEstimate?: bigint;
  skipX402?: boolean;
};

export type RevokeParams = {
  policy: Address;
};

export type ProofParams = {
  signature: string;
};

/**
 * Configure a signer and RPC once, then use the frozen top-level methods. The
 * client form (`createZetaClient`) is preferred when an app has more than one
 * wallet or cluster connection.
 */
let defaultClient: ZetaClient | undefined;

export function configureZetaClient(config: ZetaClientConfig): ZetaClient {
  defaultClient = createZetaClient(config);
  return defaultClient;
}

function client(): ZetaClient {
  if (!defaultClient) {
    throw new Error("Zeta SDK is not configured. Call configureZetaClient({ connection, payer }) first.");
  }
  return defaultClient;
}

function signedByConfiguredPayer(address: Address, action: string): void {
  if (client().payer.publicKey.toBase58() !== address) {
    throw new Error(`${action} requires authority ${address} to be the configured payer`);
  }
}

export async function createPool(params: CreatePoolParams): Promise<{ pool: Address }> {
  signedByConfiguredPayer(params.authority, "createPool");
  const result = await client().createPool({ mint: new PublicKey(params.mint) });
  return { pool: result.pool.toBase58() };
}

export async function openLine(params: OpenLineParams): Promise<{ line: Address }> {
  const result = await client().openLine({
    pool: new PublicKey(params.pool),
    agent: new PublicKey(params.agent),
    policy: new PublicKey(params.policy),
    limit: params.limit,
  });
  return { line: result.line.toBase58() };
}

/** Agent spend on an existing line: draw → x402 → settle → repay. */
export async function spend(params: SpendParams): Promise<{ signature: string; denial: number }> {
  const zeta = client();
  const operator = zeta.operator;
  if (!operator) {
    throw new Error(
      "spend requires configureZetaClient({ ..., operator }) with the settle keypair.",
    );
  }

  const result = await submitAgentSpend({
    connection: zeta.connection,
    agent: zeta.payer,
    operator,
    line: new PublicKey(params.line),
    amount: params.amount,
    endpoint: params.endpoint,
    settledEstimate: params.settledEstimate,
    skipX402: params.skipX402,
    cluster: zeta.cluster,
    network: zeta.cluster === "mainnet-beta" ? "mainnet" : "devnet",
  });

  const signatures = result.steps.filter((step) => step.signature);
  const last = signatures[signatures.length - 1];
  if (!last?.signature) {
    throw new Error("spend completed without an on-chain signature");
  }
  return { signature: last.signature, denial: Denial.Allow };
}

export async function revoke(params: RevokeParams): Promise<{ signature: string }> {
  const result = await client().revoke(new PublicKey(params.policy));
  return result;
}

export async function proof(params: ProofParams): Promise<{
  explorerUrl: string;
  allowed: boolean;
}> {
  const result = await client().proof(params.signature);
  return { explorerUrl: result.explorerUrl, allowed: result.allowed };
}
