import { randomBytes } from "node:crypto";
import { Actions, createEd25519AuthorityInfo } from "@swig-wallet/lib";
import {
  fetchSwig,
  findSwigPda,
  getAddAuthorityInstructions,
  getCreateSwigInstruction,
  getRemoveAuthorityInstructions,
  getSignInstructions,
  getSwigWalletAddress,
  type Swig,
} from "@swig-wallet/classic";
import { Connection, Keypair, PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js";
import { sendTransactionHttp } from "../devnet-rpc.js";
import { PAYMENT_CHANNELS_PROGRAM_ID, CREDIT_VAULT_PROGRAM_ID } from "../types.js";
import { saveSwigLineGrantState, type SwigLineGrantState } from "./state.js";

export type SetupSwigLineGrantParams = {
  connection: Connection;
  lender: Keypair;
  delegate: Keypair;
};

export type SetupSwigLineGrantResult = {
  state: SwigLineGrantState;
  createSignature: string;
  addDelegateSignature: string;
};

function delegateActionsForZetaSpend() {
  // Delegate can sign inner instructions (credit vault + channels CPIs)
  // but cannot manage or reassign authorities
  return Actions.set().allButManageAuthority().get();
}

async function sendIxs(connection: Connection, payer: Keypair, instructions: TransactionInstruction[]) {
  return sendTransactionHttp(connection, payer, instructions);
}

/** Create Swig wallet (lender root) + delegate role for vault/channel CPI draw path. */
export async function setupSwigLineGrant(
  params: SetupSwigLineGrantParams,
): Promise<SetupSwigLineGrantResult> {
  const { connection, lender, delegate } = params;
  const swigId = randomBytes(32);
  const swigAccount = findSwigPda(swigId);

  const createIx = await getCreateSwigInstruction({
    payer: lender.publicKey,
    id: swigId,
    actions: Actions.set().all().get(),
    authorityInfo: createEd25519AuthorityInfo(lender.publicKey),
  });
  const createSignature = await sendIxs(connection, lender, [createIx]);
  await new Promise((r) => setTimeout(r, 2000));

  let swig = await fetchSwig(connection, swigAccount);
  const rootRole = swig.findRolesByEd25519SignerPk(lender.publicKey)[0];
  if (!rootRole) throw new Error("Swig root role not found for lender");

  const addIx = await getAddAuthorityInstructions(
    swig,
    rootRole.id,
    createEd25519AuthorityInfo(delegate.publicKey),
    delegateActionsForZetaSpend(),
  );
  const addDelegateSignature = await sendIxs(connection, lender, addIx);

  swig = await fetchSwig(connection, swigAccount);
  const delegateRole = swig.findRolesByEd25519SignerPk(delegate.publicKey)[0];
  if (!delegateRole) throw new Error("Swig delegate role not found");

  const swigWallet = await getSwigWalletAddress(swig);

  // Fund swigWallet PDA with SOL so it can pay rent for channel accounts opened by the delegate
  try {
    const fundIx = SystemProgram.transfer({
      fromPubkey: lender.publicKey,
      toPubkey: swigWallet,
      lamports: 50_000_000,
    });
    await sendIxs(connection, lender, [fundIx]);
  } catch (err) {
    console.warn("Could not pre-fund swigWallet with rent lamports:", err);
  }

  const state: SwigLineGrantState = {
    swigId: [...swigId],
    swigAccount: swigAccount.toBase58(),
    swigWallet: swigWallet.toBase58(),
    rootRoleId: rootRole.id,
    delegateRoleId: delegateRole.id,
    lender: lender.publicKey.toBase58(),
    delegate: delegate.publicKey.toBase58(),
    createdAt: new Date().toISOString(),
  };
  saveSwigLineGrantState(state);

  return { state, createSignature, addDelegateSignature };
}

export async function fetchSwigForState(connection: Connection, state: SwigLineGrantState): Promise<Swig> {
  return fetchSwig(connection, new PublicKey(state.swigAccount));
}

/** Wrap inner instructions (draw, repay) with Swig Sign for the delegate role. */
export async function swigSignInstructions(
  swig: Swig,
  delegateRoleId: number,
  inner: TransactionInstruction[],
): Promise<TransactionInstruction[]> {
  return getSignInstructions(swig, delegateRoleId, inner);
}

/** Lender removes the spend delegate role (M4 — delegate can no longer Swig-sign). */
export async function removeSwigSpendDelegate(params: {
  connection: Connection;
  lender: Keypair;
  state: SwigLineGrantState;
}): Promise<{ signature: string; swig: Swig }> {
  const { connection, lender, state } = params;
  if (state.delegateRevokedAt) {
    throw new Error("delegate already revoked at " + state.delegateRevokedAt);
  }
  let swig = await fetchSwig(connection, new PublicKey(state.swigAccount));
  const rootRole = swig.findRolesByEd25519SignerPk(lender.publicKey)[0];
  if (!rootRole) throw new Error("Swig root role not found for lender");

  const removeIx = await getRemoveAuthorityInstructions(
    swig,
    rootRole.id,
    state.delegateRoleId,
  );
  const signature = await sendIxs(connection, lender, removeIx);
  swig = await fetchSwig(connection, new PublicKey(state.swigAccount));
  return { signature, swig };
}
