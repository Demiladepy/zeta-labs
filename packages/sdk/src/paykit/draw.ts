import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { CREDIT_VAULT_PROGRAM_ID } from "../types.js";
import {
  buildChannelOpenLayout,
  type ChannelOpenParams,
} from "./channel.js";
import { buildDrawWithChannelOpenInstruction } from "./instructions.js";

export type VaultDrawOpenParams = ChannelOpenParams & {
  creditVaultProgramId?: PublicKey;
  agent: PublicKey;
  pool: PublicKey;
  line: PublicKey;
  policy: PublicKey;
  clock?: PublicKey;
};

export type VaultDrawOpenPlan = {
  layout: ReturnType<typeof buildChannelOpenLayout>;
  instruction: TransactionInstruction;
};

/**
 * Phase 1 hot path: agent signs `draw`, vault PDA CPI-signs Payment Channels `open`.
 */
export function planVaultDrawOpen(params: VaultDrawOpenParams): VaultDrawOpenPlan {
  const layout = buildChannelOpenLayout(params);
  const instruction = buildDrawWithChannelOpenInstruction({
    creditVaultProgramId:
      params.creditVaultProgramId ?? new PublicKey(CREDIT_VAULT_PROGRAM_ID),
    paymentChannelsProgramId: layout.accounts.selfProgram,
    agent: params.agent,
    pool: params.payer,
    line: params.line,
    policy: params.policy,
    payee: params.payee,
    rentPayer: params.rentPayer,
    clock:
      params.clock ??
      new PublicKey("SysvarC1ock11111111111111111111111111111111"),
    draw: params.draw,
    openAccounts: layout.openAccountPubkeys,
    distributionExtra: layout.distributionExtra,
  });

  return { layout, instruction };
}
