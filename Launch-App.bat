@echo off
REM Resume Generator - Electron App Launcher
REM This script starts the Resume Generator application

cd /d "%~dp0"

REM Check if Node is installed
where /q node
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if Python is installed
where /q python
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    echo.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "web\node_modules" (
    echo Installing Node dependencies...
    cd web
    call npm install
    cd ..
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install Node dependencies
        pause
        exit /b 1
    )
)

REM Create Python virtual environment if it doesn't exist
if not exist "web\venv" (
    echo Creating Python virtual environment...
    python -m venv web\venv
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to create Python virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment and install Python dependencies
echo Installing Python dependencies...
call web\venv\Scripts\activate.bat
pip install -q -r web\requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

REM Start the Electron app
echo.
echo Starting Resume Generator...
echo.

cd web
npm install -g electron
npx electron ..

pause
