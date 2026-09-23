/**
 * SDK skeleton. Joshna: fill these against the deployed programs.
 * Names are frozen. Types come from ./types — do not fork layouts.
 */

export {
  ACCOUNT_DISCRIMINATOR,
  CREDIT_LINE_LEN,
  CREDIT_VAULT_PROGRAM_ID,
  Denial,
  DEVNET_USDC,
  INTERFACE_VERSION,
  PAYMENT_CHANNELS_PROGRAM_ID,
  POLICY_IX,
  POLICY_LEN,
  POLICY_REGISTRY_PROGRAM_ID,
  POOL_LEN,
  VAULT_IX,
} from "./types.js";

export { ACCOUNT_ORDER, PDA_ALLOC } from "./accountOrder.js";

export type {
  AuditRecord,
  CreditLine,
  DrawArgs,
  DrawChannelSpec,
  EvaluateArgs,
  Policy,
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
};

export type RevokeParams = {
  policy: Address;
};

export type ProofParams = {
  signature: string;
};

export async function createPool(_params: CreatePoolParams): Promise<{ pool: Address }> {
  throw new Error("createPool: waiting on deployed Credit Vault (Demilade)");
}

export async function openLine(_params: OpenLineParams): Promise<{ line: Address }> {
  throw new Error("openLine: waiting on deployed Credit Vault (Demilade)");
}

export async function spend(_params: SpendParams): Promise<{ signature: string; denial: number }> {
  throw new Error("spend: waiting on draw + pay-kit (Demilade / Anurag)");
}

export async function revoke(_params: RevokeParams): Promise<{ signature: string }> {
  throw new Error("revoke: waiting on deployed Policy Registry (Demilade)");
}

export async function proof(_params: ProofParams): Promise<{
  explorerUrl: string;
  allowed: boolean;
}> {
  throw new Error("proof: decode AuditRecord from the tx (Joshna)");
}
