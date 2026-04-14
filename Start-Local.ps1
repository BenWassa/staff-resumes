$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webDir = Join-Path $repoRoot "web"

function Test-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "node")) {
    Write-Host "Node.js is not installed or not on PATH." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "npm is not installed or not on PATH." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

if (-not (Test-Command "python")) {
    Write-Host "Python is not installed or not on PATH." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Starting Staff Resumes local site..." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5174" -ForegroundColor Yellow
Write-Host "API: http://localhost:8002" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Write-Host "Installing web npm dependencies..." -ForegroundColor Cyan
    Push-Location $webDir
    npm install
    Pop-Location
}

$venvPython = Join-Path $webDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    Push-Location $repoRoot
    python -m venv "web\venv"
    Pop-Location
    $venvPython = Join-Path $webDir "venv\Scripts\python.exe"
}

$venvPip = Join-Path $webDir "venv\Scripts\pip.exe"
if (-not (Test-Path $venvPip)) {
    Write-Host "pip was not found in web\\venv." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$requirementsStamp = Join-Path $webDir "venv\.requirements-installed"
if (-not (Test-Path $requirementsStamp)) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
    Push-Location $repoRoot
    & $venvPip install -r requirements.txt
    New-Item -ItemType File -Path $requirementsStamp -Force | Out-Null
    Pop-Location
}

if (-not (Test-Path (Join-Path $webDir ".env.local"))) {
    Write-Host "Warning: web\\.env.local is missing. Frontend Firebase config may be incomplete." -ForegroundColor Yellow
}

$env:Path = "$(Join-Path $webDir 'venv\Scripts');$env:Path"

# Check if config has been set up
$configPath = Join-Path $env:APPDATA "ResumeGenerator\config.json"
$configExists = Test-Path $configPath
if (-not $configExists) {
    Write-Host ""
    Write-Host "⚠️  Setup Wizard" -ForegroundColor Yellow
    Write-Host "You'll need to configure your Projects folder on first run." -ForegroundColor Yellow
    Write-Host "This will open automatically when you first access the admin panel." -ForegroundColor Yellow
    Write-Host ""
}

Start-Process "http://localhost:5174"

Push-Location $webDir
npm run dev
Pop-Location
