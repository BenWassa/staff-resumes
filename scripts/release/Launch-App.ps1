param(
    [ValidateSet("release", "dev", "unpackaged")]
    [string]$Mode = "release",
    [bool]$ClearNsisCache = $true,
    [switch]$RunPortable
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$webRoot = Join-Path $repoRoot "web"
$releaseScript = Join-Path $PSScriptRoot "build_release.ps1"
$portableExe = Join-Path $webRoot "release\Resume Generator 0.1.0.exe"
$venvPython = Join-Path $repoRoot "web\venv\Scripts\python.exe"

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Assert-Success {
    param(
        [int]$ExitCode,
        [string]$StepName
    )
    if ($ExitCode -ne 0) {
        throw "$StepName failed with exit code $ExitCode"
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host " Resume Generator - Launcher ($Mode mode)"
Write-Host "=========================================="
Write-Host ""

if (-not (Test-CommandExists "node")) { throw "Node.js is not installed or not in PATH." }
if (-not (Test-CommandExists "python")) { throw "Python is not installed or not in PATH." }

if (-not (Test-Path (Join-Path $webRoot "node_modules"))) {
    Write-Host "Installing Node dependencies..." -ForegroundColor Cyan
    Push-Location $webRoot
    try {
        & npm install
        Assert-Success -ExitCode $LASTEXITCODE -StepName "npm install"
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    & python -m venv (Join-Path $repoRoot "web\venv")
    Assert-Success -ExitCode $LASTEXITCODE -StepName "python -m venv"
}

Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install -q -r (Join-Path $webRoot "requirements.txt")
Assert-Success -ExitCode $LASTEXITCODE -StepName "pip install"

switch ($Mode) {
    "dev" {
        Push-Location $webRoot
        try {
            Write-Host "Starting Electron in dev mode..." -ForegroundColor Cyan
            & npm run electron:dev
            Assert-Success -ExitCode $LASTEXITCODE -StepName "npm run electron:dev"
        }
        finally {
            Pop-Location
        }
    }
    "unpackaged" {
        Push-Location $webRoot
        try {
            Write-Host "Starting unpackaged Electron app..." -ForegroundColor Cyan
            & npx electron ..
            Assert-Success -ExitCode $LASTEXITCODE -StepName "npx electron .."
        }
        finally {
            Pop-Location
        }
    }
    default {
        Write-Host "Building release artifacts..." -ForegroundColor Cyan
        & $releaseScript -ClearNsisCache:$ClearNsisCache
        Assert-Success -ExitCode $LASTEXITCODE -StepName "build_release.ps1"
        if ($RunPortable) {
            if (-not (Test-Path $portableExe)) {
                throw "Portable executable not found at $portableExe"
            }
            Write-Host "Launching portable app..." -ForegroundColor Cyan
            Start-Process -FilePath $portableExe | Out-Null
        }
    }
}
