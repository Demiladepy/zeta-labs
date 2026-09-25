/**
 * ClawPump API smoke — list agents with CLAWPUMP_API_KEY.
 *
 *   copy scripts\clawpump.env.example scripts\clawpump.env
 *   npm run clawpump:smoke --prefix packages/sdk
 *
 * Never commit the API key.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadClawpumpKey(): string {
  const fromEnv = process.env.CLAWPUMP_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const envPath = resolve(import.meta.dirname, "../../../scripts/clawpump.env");
  if (!existsSync(envPath)) {
    throw new Error(
      `Missing CLAWPUMP_API_KEY and ${envPath}\n` +
        "Copy scripts/clawpump.env.example → scripts/clawpump.env (gitignored).",
    );
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "CLAWPUMP_API_KEY" && value) return value;
  }
  throw new Error(`CLAWPUMP_API_KEY not set in ${envPath}`);
}

async function main() {
  const apiKey = loadClawpumpKey();
  console.log("=== ClawPump smoke ===");
  console.log(`key: ${apiKey.slice(0, 8)}… (${apiKey.length} chars)`);

  const res = await fetch("https://clawpump.tech/api/v1/agents", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /api/v1/agents → ${res.status} ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    agents?: Array<{
      id: string;
      name: string;
      status?: string;
      walletAddress?: string;
      persona?: string;
    }>;
  };

  const agents = data.agents ?? [];
  console.log(`agents: ${agents.length}`);
  for (const agent of agents.slice(0, 20)) {
    console.log(`- ${agent.name} (${agent.id})`);
    console.log(`  status=${agent.status ?? "?"} wallet=${agent.walletAddress ?? "?"}`);
    if (agent.persona) console.log(`  persona=${agent.persona.slice(0, 100)}…`);
  }

  const zeta =
    agents.find((a) => a.id === "c2bcae2d-1012-48d8-97b8-416649b32793") ??
    agents.find((a) => a.name === "zeta-credit-agent" && a.persona?.includes("Zeta")) ??
    agents.find((a) => a.name === "zeta-credit-agent");
  if (zeta) {
    console.log("\n✓ zeta-credit-agent found");
    console.log(`  dashboard: https://clawpump.tech/dashboard/agents/${zeta.id}`);
  } else {
    console.log("\n○ zeta-credit-agent not in first page — create via MCP or POST /api/v1/agents");
  }

  console.log("\nOK — ClawPump smoke finished.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
