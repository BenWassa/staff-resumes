$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

& .\.venv\Scripts\python.exe -m src.validate_config
& .\.venv\Scripts\python.exe run_pipeline.py
