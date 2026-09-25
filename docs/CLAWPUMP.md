# ClawPump wedge (World’s Fair–safe)

Honest claim: Zeta Labs is **policy-bounded agent credit on Solana**. ClawPump is the
**agent surface** for the track form — not “we built ClawPump trading.”

Do **not** change vault/policy programs for this wedge.

## Security

1. Rotate any `cpk_…` key that was pasted in chat: https://clawpump.tech/dashboard/api
2. Copy [`scripts/clawpump.env.example`](../scripts/clawpump.env.example) → `scripts/clawpump.env` (gitignored)
3. Never commit `scripts/clawpump.env` or put the key in the repo

## MCP (Cursor)

Repo wrapper loads the gitignored env file:

```powershell
C:\Users\User\zeta-labs\scripts\clawpump-mcp.cmd
```

Cursor `~/.cursor/mcp.json` should include:

```json
"clawpump-agents": {
  "command": "cmd",
  "args": ["/c", "C:\\Users\\User\\zeta-labs\\scripts\\clawpump-mcp.cmd"]
}
```

Or one-shot:

```powershell
$env:CLAWPUMP_API_KEY = "cpk_YOUR_ROTATED_KEY"
npx -y @clawpump/agents --cursor
```

Restart Cursor / reload MCP after changing config.

## Live agent (created for this wedge)

| Field | Value |
| --- | --- |
| Name | `zeta-credit-agent` |
| Agent ID | `c2bcae2d-1012-48d8-97b8-416649b32793` |
| Wallet | `9dnWR2NVcMfAfDu73EMBxqM1yjkKSvLRnXT7sbSfPeTT` |
| Persona | Policy-bounded Solana credit — cap / expiry / revoke; no unconstrained USDC |
| Dashboard | https://clawpump.tech/dashboard/agents/c2bcae2d-1012-48d8-97b8-416649b32793 |

Custom-skill HTTP routes returned 404 at submit time; the **persona** carries the Zeta
credit instructions. After MCP connects, prefer `create_custom_skill` / `update_agent`
via Agent MCP tools.

## Demo story for judges

```text
ClawPump agent (wallet + persona)
        →
Zeta policy line (Devnet evaluate)
        →
Credit Vault draw → Payment Channels → settle/repay
```

Technical video: ClawPump agent page → cut to `npm run devnet:spend-submit` → Explorer txs.
See [`docs/RECORD.md`](./RECORD.md).

## Smoke

```powershell
cd C:\Users\User\zeta-labs\packages\sdk
# requires scripts/clawpump.env
npm run clawpump:smoke
```

## Out of scope (do not claim)

- pump.fun launches, paid swaps, Phoenix perps, marketplace bids
- Dashboard click-tour as ClawPump integration
