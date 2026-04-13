$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

$backend = Start-Process -FilePath "$repoRoot\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn web.main:app --reload --port 8002" -WorkingDirectory $repoRoot -PassThru
Write-Host "Backend PID: $($backend.Id)"

Push-Location "$repoRoot\web"
try {
    npm run dev
}
finally {
    Pop-Location
    if (-not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force
    }
}
