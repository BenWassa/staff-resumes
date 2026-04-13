# Resume Generator - Electron App Setup

This guide will help you build and run the Resume Generator as a standalone Windows application.

## Prerequisites

Before you start, make sure you have installed:
- **Node.js** (v20+): Download from https://nodejs.org/
- **Python** (v3.11+): Download from https://www.python.org/

Verify installation by opening a terminal and running:
```bash
node --version
python --version
```

## Quick Start

### Option 1: One-Click Launch (Easiest)

1. Double-click **`Launch-App.ps1`** 

This script will:
- Check dependencies
- Install Node packages (first time only)
- Create a Python virtual environment (first time only)
- Start the Electron app automatically

### Option 2: PowerShell Launch

Open PowerShell in this folder and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\Launch-App.ps1
```

### Option 3: Manual Setup

For development with hot-reload:
```bash
cd web
npm install
npm run electron:dev
```

For building a production app:
```bash
cd web
npm install
npm run build:electron
```

## Building the Windows Installer

To create a standalone `.exe` installer that users can install on their machine:

```bash
cd web
npm install
npm run build:electron
```

This will create:
- `dist/Resume Generator Setup x.x.x.exe` - Installer
- `dist/Resume Generator x.x.x.exe` - Portable executable (no install needed)

Both can be distributed to end users.

## What Happens When You Launch

1. The launcher checks that Node.js and Python are installed
2. Python virtual environment is created (first time only)
3. Node dependencies are installed (first time only)
4. Python backend starts on `http://localhost:8002`
5. Electron window opens and loads the React frontend
6. Your app is ready to use!

## Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart your terminal/PowerShell after installing

### "Python not found"
- Install Python from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation
- Restart your terminal/PowerShell after installing

### Port 8002 already in use
The backend couldn't start because another process is using port 8002. Try:
```bash
# Kill the process using port 8002
netstat -ano | findstr :8002
taskkill /PID <PID> /F
```

### Module not found errors
Delete `web/node_modules` and `venv` folders, then run the launcher again:
```bash
rmdir /s /q web\node_modules
rmdir /s /q venv
```

## Data Folders

Users will be able to specify the data folders from the app interface:
- `_generated`: Where generated files are stored
- `person_workbooks`: Where individual workbooks are loaded from

These paths can be configured in the app UI.

## Development Notes

- The Electron main process is in `electron-main.js`
- The Vite config is in `web/vite.config.js`
- React components are in `web/src/`
- Python backend is in `web/main.py`
- The build output goes to `web/dist/`

For development, run `npm run electron:dev` in the `web/` folder for hot reload.
