import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, it } from "node:test";
import {
  assertAuthorityOwnsLine,
  drawSignerKeypair,
  lineAgentPubkey,
  spendAuthorityFromAgentKeypair,
} from "../src/spend-authority.js";
import { buildSwigWrappedDrawSpec } from "../src/swig/wrap-draw.js";
import { CREDIT_VAULT_PROGRAM_ID } from "../src/types.js";

const CREDIT_VAULT_ID = new PublicKey(CREDIT_VAULT_PROGRAM_ID);

describe("spend-authority", () => {
  it("raw keypair uses agent for line and signing", () => {
    const agent = Keypair.generate();
    const auth = spendAuthorityFromAgentKeypair(agent);
    assert.equal(auth.kind, "raw-keypair");
    assert.ok(lineAgentPubkey(auth).equals(agent.publicKey));
    assert.ok(drawSignerKeypair(auth).publicKey.equals(agent.publicKey));
    assertAuthorityOwnsLine(agent.publicKey, auth);
  });

  it("swig delegate separates wallet and signing key", () => {
    const wallet = Keypair.generate().publicKey;
    const delegate = Keypair.generate();
    const auth = { kind: "swig-delegate" as const, swigWallet: wallet, delegate };
    assert.ok(lineAgentPubkey(auth).equals(wallet));
    assert.ok(drawSignerKeypair(auth).publicKey.equals(delegate.publicKey));
    assertAuthorityOwnsLine(wallet, auth);
    assert.throws(() => assertAuthorityOwnsLine(delegate.publicKey, auth));
  });
});

describe("wrap-draw", () => {
  it("requires draw ix agent meta to match swig wallet", () => {
    const swig = Keypair.generate().publicKey;
    const other = Keypair.generate().publicKey;
    const drawIx = {
      programId: CREDIT_VAULT_ID,
      keys: [{ pubkey: other, isSigner: true, isWritable: false }],
      data: Buffer.alloc(8),
    };
    assert.throws(() => buildSwigWrappedDrawSpec(swig, drawIx as import("@solana/web3.js").TransactionInstruction));
    const ok = buildSwigWrappedDrawSpec(swig, {
      ...drawIx,
      keys: [{ pubkey: swig, isSigner: true, isWritable: false }],
    });
    assert.ok(ok.allowedProgramIds[0].equals(CREDIT_VAULT_ID));
  });
});
