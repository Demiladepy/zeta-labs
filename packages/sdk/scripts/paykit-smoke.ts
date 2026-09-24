/**
 * Offline smoke: build vault draw → Payment Channels open without submitting.
 * Run: npm run paykit:smoke --prefix packages/sdk
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import { DEVNET_USDC } from "../src/types.js";
import {
  encodePaymentChannelsOpen,
  planVaultDrawOpen,
  selfFacilitatingDistribution,
} from "../src/paykit/index.js";

function pk(): PublicKey {
  return Keypair.generate().publicKey;
}

const agent = pk();
const pool = pk();
const line = pk();
const policy = pk();
const payee = pk();
const rentPayer = agent;
const mint = new PublicKey(DEVNET_USDC);
const payerTokenAccount = pk();

const draw = {
  amount: 1_000_000n,
  salt: 42n,
  gracePeriod: 300,
  openSlot: 250_000_000n,
};

const { layout, instruction } = planVaultDrawOpen({
  agent,
  pool,
  line,
  policy,
  payer: pool,
  payerTokenAccount,
  payee,
  mint,
  rentPayer,
  draw,
});

const openIxData = encodePaymentChannelsOpen(
  layout.spec,
  layout.distributionExtra,
);

console.log("=== Zeta pay-kit smoke (offline) ===");
console.log("channel PDA:", layout.channel.toBase58());
console.log("channel ATA:", layout.channelTokenAccount.toBase58());
console.log("distribution extra bytes:", layout.distributionExtra.length);
console.log(
  "distribution matches self-facilitating:",
  Buffer.compare(
    Buffer.from(layout.distributionExtra),
    Buffer.from(selfFacilitatingDistribution()),
  ) === 0,
);
console.log("draw ix accounts:", instruction.keys.length, "(expect 22)");
console.log("outer pool PDA signer:", instruction.keys[8]?.isSigner, "(expect false)");
console.log("outer rent payer signer:", instruction.keys[9]?.isSigner, "(expect true)");
console.log("draw ix data bytes:", instruction.data.length);
console.log("open ix header+extra bytes:", openIxData.length);
console.log("deposit == x402 maxAmount:", layout.spec.deposit === draw.amount);
console.log("OK — instruction shells built. Submit after vault deploy.");
