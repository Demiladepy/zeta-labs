import { createKeyPairSignerFromBytes } from "@solana/kit";
import { readFileSync } from "node:fs";
import { loadDevnetEnv } from "./load-devnet-env.js";

async function main() {
  const env = loadDevnetEnv();
  const endpoint = env.x402Endpoint ?? "http://127.0.0.1:3000/api/v1/fortune";
  const secret = JSON.parse(readFileSync(env.agentKeypairPath, "utf8")) as number[];
  const signer = await createKeyPairSignerFromBytes(Uint8Array.from(secret));
  const payKitClient = await import("@solana/pay-kit/client");
  const client = await payKitClient.PayKitClient.builder()
    .signer(signer)
    .rpcUrl(env.rpcUrl)
    .network(env.network)
    .permissions(false)
    .onProgress((e) => console.log("progress", JSON.stringify(e)))
    .build();
  try {
    const response = await client.fetch(endpoint, { method: "GET" }, "x402");
    console.log("status", response.status);
    console.log("body", await response.text());
  } catch (e) {
    console.error("threw", e);
  }
}

main();
