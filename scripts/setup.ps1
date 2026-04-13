param(
    [switch]$SkipFrontend
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path .venv)) {
    python -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pip install -r web\requirements.txt

if (-not $SkipFrontend) {
    Push-Location web
    try {
        npm install
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host 'Created .env from .env.example'
}

if ((Test-Path data\\selections.example.yaml) -and -not (Test-Path data\\selections.yaml)) {
    Copy-Item data\\selections.example.yaml data\\selections.yaml
    Write-Host 'Created data\\selections.yaml from selections.example.yaml'
}

Write-Host 'Setup complete.'
