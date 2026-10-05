$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Node.js not found. Install Node.js 20 or newer.' }
$env:PORT = '8082'
$portBusy = $false
$probe = New-Object System.Net.Sockets.TcpClient
try { $probe.Connect('127.0.0.1', 8082); $portBusy = $true } catch {} finally { $probe.Dispose() }
if ($portBusy) {
  Write-Host 'Port 8082 is already in use. Open http://127.0.0.1:8082/ . No processes were stopped.'
  exit 0
}
& $nodeExecutable (Join-Path $PSScriptRoot 'src\server.js')
exit $LASTEXITCODE

