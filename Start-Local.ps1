$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
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

function Test-PortInUse($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

if (Test-PortInUse 5174) {
    Write-Host "Warning: Port 5174 is already in use. Vite may fail to start." -ForegroundColor Yellow
}
if (Test-PortInUse 8012) {
    Write-Host "Warning: Port 8012 is already in use. The API server may fail to start." -ForegroundColor Yellow
}

Write-Host "Starting Staff Resumes local site..." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5174" -ForegroundColor Yellow
Write-Host "API: http://localhost:8012" -ForegroundColor Yellow
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

$requirementsFile = Join-Path $repoRoot "requirements.txt"
$requirementsStamp = Join-Path $webDir "venv\.requirements-installed"
$requirementsHash = (Get-FileHash $requirementsFile -Algorithm MD5).Hash
$stampHash = ""
if (Test-Path $requirementsStamp) {
    $stampContent = Get-Content $requirementsStamp -Raw
    if ($stampContent) { $stampHash = $stampContent.Trim() }
}

if ($requirementsHash.Trim() -ne $stampHash) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
    Push-Location $repoRoot
    & $venvPip install -r requirements.txt
    Set-Content -Path $requirementsStamp -Value $requirementsHash -NoNewline
    Pop-Location
}

if (-not (Test-Path (Join-Path $webDir ".env.local"))) {
    Write-Host "Warning: web\\.env.local is missing. Only local defaults will be used." -ForegroundColor Yellow
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

# Open browser after a short delay so Vite has time to start
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:5174"
} | Out-Null

Push-Location $webDir
npm run dev
Pop-Location
