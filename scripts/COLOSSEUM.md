# Colosseum Copilot (local)

Credentials live in `scripts/colosseum.env` (gitignored).

```powershell
Get-Content .\scripts\colosseum.env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  Set-Item -Path "Env:$k" -Value $v
}
curl.exe -sS "$env:COLOSSEUM_COPILOT_API_BASE/status" `
  -H "Authorization: Bearer $env:COLOSSEUM_COPILOT_PAT"
```

Skill: `ColosseumOrg/colosseum-copilot` → `~\.agents\skills\colosseum-copilot`

**Security:** the PAT was pasted in chat. Rotate it in Colosseum if this conversation is shared.
