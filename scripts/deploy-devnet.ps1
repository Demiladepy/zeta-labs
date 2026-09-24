param(
  [Parameter(Mandatory = $true)] [string] $PolicyProgramSo,
  [Parameter(Mandatory = $true)] [string] $VaultProgramSo,
  [Parameter(Mandatory = $true)] [string] $PolicyProgramKeypair,
  [Parameter(Mandatory = $true)] [string] $VaultProgramKeypair,
  [string] $Url = "https://api.devnet.solana.com"
)

$required = @($PolicyProgramSo, $VaultProgramSo, $PolicyProgramKeypair, $VaultProgramKeypair)
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required file not found: $path"
  }
}

if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
  throw "Solana CLI is not installed or is not on PATH."
}
if (-not (Get-Command solana-keygen -ErrorAction SilentlyContinue)) {
  throw "solana-keygen is not installed or is not on PATH."
}

$expectedPolicyId = "G1KqFJPuxkCDGxTMjSPSsD6hh3ZBA6hqv2NGpfhfc6gk"
$expectedVaultId = "4M9eej8FKXzwgwRKKN3uy5bUfuAXp1aS7ewc7he9mMHi"
$actualPolicyId = (& solana-keygen pubkey $PolicyProgramKeypair).Trim()
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$actualVaultId = (& solana-keygen pubkey $VaultProgramKeypair).Trim()
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($actualPolicyId -ne $expectedPolicyId) {
  throw "Policy keypair is $actualPolicyId; SDK expects $expectedPolicyId"
}
if ($actualVaultId -ne $expectedVaultId) {
  throw "Vault keypair is $actualVaultId; SDK expects $expectedVaultId"
}

solana program deploy --url $Url --program-id $PolicyProgramKeypair $PolicyProgramSo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
solana program deploy --url $Url --program-id $VaultProgramKeypair $VaultProgramSo
exit $LASTEXITCODE
