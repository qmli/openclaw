param(
  [string]$Token = "local-dev-token-123",
  [int]$GatewayPort = 1901,
  [string]$UiPort = "5173"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $repoRoot

# Make gateway auth token available to child processes (gateway + UI).
$env:OPENCLAW_GATEWAY_TOKEN = $Token

Write-Host "OPENCLAW_GATEWAY_TOKEN set to: $Token"
Write-Host "Starting Gateway (dev, token auth, port $GatewayPort)..."

$gatewayArgs = @(
  "openclaw",
  "gateway",
  "--dev",
  "--auth",
  "token",
  "--token",
  $Token,
  "--port",
  $GatewayPort,
  "--bind",
  "loopback",
  "--force"
)

$gatewayProc = Start-Process -PassThru -NoNewWindow `
  pnpm -ArgumentList $gatewayArgs -WorkingDirectory $repoRoot

Write-Host "Starting Control UI (vite dev on http://localhost:$UiPort) ..."
$uiProc = Start-Process -PassThru -NoNewWindow `
  pnpm -ArgumentList @("ui:dev") -WorkingDirectory $repoRoot

$gatewayUrl = "ws://127.0.0.1:$GatewayPort"
$gatewayUrlEncoded = [System.Uri]::EscapeDataString($gatewayUrl)

$uiUrl = "http://localhost:$UiPort/ui/overview?gatewayUrl=$gatewayUrlEncoded#token=$Token"
Write-Host "Open UI:" $uiUrl

Start-Process $uiUrl | Out-Null

Write-Host "Gateway PID: $($gatewayProc.Id), UI PID: $($uiProc.Id)"
Write-Host "Press Ctrl+C to stop."

# Keep the script alive while processes run.
while ($true) {
  Start-Sleep -Seconds 2
  if (-not (Get-Process -Id $gatewayProc.Id -ErrorAction SilentlyContinue)) {
    break
  }
}
