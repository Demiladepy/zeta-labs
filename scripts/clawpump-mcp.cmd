@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
if exist "scripts\clawpump.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("scripts\clawpump.env") do (
    if not "%%A"=="" set "%%A=%%B"
  )
)
if "%CLAWPUMP_API_KEY%"=="" (
  echo Missing CLAWPUMP_API_KEY. Copy scripts\clawpump.env.example to scripts\clawpump.env
  exit /b 1
)
npx -y @clawpump/agents %*
