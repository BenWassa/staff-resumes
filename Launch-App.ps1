# Resume Generator - Electron App Launcher
# This script starts the Resume Generator application

param(
    [switch]$Dev = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "=========================================="
Write-Host "    Resume Generator - Starting App"
Write-Host "=========================================="
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    try {
        if (Get-Command $command -ErrorAction Stop) { return $true }
    }
    catch { return $false }
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
if (-not (Test-CommandExists "node")) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Node.js found" -ForegroundColor Green

# Check Python
Write-Host "Checking Python..." -ForegroundColor Cyan
if (-not (Test-CommandExists "python")) {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Python found" -ForegroundColor Green
Write-Host ""

# Install Node dependencies
if (-not (Test-Path "web\node_modules")) {
    Write-Host "Installing Node dependencies..." -ForegroundColor Cyan
    Push-Location "web"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Node dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Pop-Location
    Write-Host "[OK] Node dependencies installed" -ForegroundColor Green
}

# Setup Python environment
if (-not (Test-Path "web\venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv web\venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create Python virtual environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "Activating Python environment..." -ForegroundColor Cyan
& ".\web\venv\Scripts\Activate.ps1"

Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
pip install -q -r web\requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Python dependencies installed" -ForegroundColor Green
Write-Host ""

# Start the Electron app
Write-Host "Starting Resume Generator..." -ForegroundColor Cyan
Write-Host ""

Push-Location "web"

if ($Dev) {
    npm run electron:dev
} else {
    # Build and run
    npm run build:electron
}

Pop-Location
