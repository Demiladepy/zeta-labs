# Start pay-kit playground API for Zeta x402 demos (devnet).
# Requires a local clone: C:\Projects\pay-kit (or set $PayKitRoot).

param(
  [string]$PayKitRoot = "C:\Projects\pay-kit",
  [int]$Port = 3000
)

$playground = Join-Path $PayKitRoot "typescript\examples\playground-api"
if (-not (Test-Path $playground)) {
  Write-Error "playground-api not found at $playground. Clone https://github.com/solana-foundation/pay-kit"
  exit 1
}

$env:NETWORK = "devnet"
$env:RPC_URL = "https://api.devnet.solana.com"
$env:PORT = "$Port"

Write-Host "Starting pay-kit playground on http://127.0.0.1:$Port (NETWORK=devnet)"
Set-Location $playground
npx tsx index.ts
