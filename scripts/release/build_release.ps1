param(
    [bool]$ClearNsisCache = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$webRoot = Join-Path $repoRoot "web"
$releaseDir = Join-Path $webRoot "release"
$logDir = Join-Path $repoRoot "outputs\build-logs"

if (-not (Test-Path (Join-Path $webRoot "package.json"))) {
    throw "Could not find web\\package.json. Run this script from inside the repository."
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "release-build-$timestamp.log"

Write-Host "Starting release build..."
Write-Host "Repo root: $repoRoot"
Write-Host "Log file:  $logFile"
Write-Host ""

Push-Location $webRoot
try {
    Start-Transcript -Path $logFile -Force | Out-Null

    if ($ClearNsisCache) {
        $nsisCache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\nsis"
        $nsisResourcesCache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\nsis-resources"
        if (Test-Path $nsisCache) { Remove-Item -LiteralPath $nsisCache -Recurse -Force }
        if (Test-Path $nsisResourcesCache) { Remove-Item -LiteralPath $nsisResourcesCache -Recurse -Force }
        Write-Host "Cleared electron-builder NSIS cache."
    }

    if (-not (Test-Path (Join-Path $webRoot "node_modules"))) {
        Write-Host "node_modules missing. Running npm install..."
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
    }

    Write-Host "Running npm run build:electron..."
    & npm run build:electron
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "Release artifacts:"
    Get-ChildItem -File $releaseDir |
        Select-Object Name, Length, LastWriteTime |
        Format-Table -AutoSize
}
finally {
    try {
        Stop-Transcript | Out-Null
    }
    catch {
        # Ignore transcript shutdown errors.
    }
    Pop-Location
}

Write-Host ""
Write-Host "Release build complete."
