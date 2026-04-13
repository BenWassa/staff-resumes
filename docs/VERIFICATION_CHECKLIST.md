# Electron Setup - Verification Checklist

Use this checklist to verify that the Electron setup is working correctly before distributing to users.

## Prerequisites ✓

- [ ] Node.js v20+ installed (`node --version`)
- [ ] Python 3.11+ installed (`python --version`)
- [ ] Both in your PATH (can run from any terminal)
- [ ] Git repository is clean (no uncommitted changes you want to keep)

## Setup Verification

### Step 1: Clean Dependencies (First Time Only)

```bash
# Navigate to project root
cd web

# Remove existing node_modules and package lock
rm -r node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Install with legacy peer deps support
npm install --legacy-peer-deps
```

- [ ] npm install completes without errors

### Step 2: Build Test

```bash
# Still in web/ folder
npm run build
```

- [ ] Vite build completes successfully
- [ ] `dist/` folder is created with files
- [ ] `dist/index.html` exists
- [ ] `dist/assets/` folder exists with CSS and JS files

### Step 3: Python Backend Test

```bash
# From web/ folder
python -m uvicorn main:app --port 8002
```

Then in another terminal:
```bash
curl http://localhost:8002/health
```

- [ ] Backend starts without errors
- [ ] Port 8002 is accessible
- [ ] Health endpoint returns successful response (curl succeeds)
- [ ] Press Ctrl+C to stop the backend

### Step 4: Manual Electron Test (Development Mode)

```bash
# From web/ folder
npm run electron:dev
```

Wait for both servers to start, then:

- [ ] Electron window opens
- [ ] React UI loads (you see the Resume Generator interface)
- [ ] No JavaScript errors in the console (Ctrl+Shift+I to open DevTools)
- [ ] Can interact with the UI (click buttons, fill forms, etc.)
- [ ] Backend is responding (make a request from the UI, check DevTools Network tab)
- [ ] Close the window (kills both backend and frontend automatically)

### Step 5: Production Build Test

```bash
# From web/ folder
npm run build:electron
```

Check the output:

- [ ] Build completes without errors
- [ ] `dist/Resume Generator Setup*.exe` file exists
- [ ] `dist/Resume Generator*.exe` portable file exists
- [ ] `dist/` folder contains the files above

### Step 6: Launcher Script Test

```bash
# From project root (NOT web folder)
.\Launch-App.ps1
```

Or double-click `Launch-App.vbs`

- [ ] No errors about missing dependencies
- [ ] Backend starts and prints output
- [ ] Electron window opens
- [ ] UI loads correctly
- [ ] App responds to interactions
- [ ] Close the window to exit

## User Launch Methods

Test all three launch methods:

### Method 1: VBScript Double-Click
```
Right-click Launch-App.vbs → Open
```
- [ ] App launches without showing terminal
- [ ] App fully functional

### Method 2: PowerShell Direct
```
Right-click Launch-App.ps1 → Run with PowerShell
```
- [ ] Shows nice colored output
- [ ] App launches correctly
- [ ] Helpful messages display

### Method 3: Batch File
```
Double-click Launch-App.bat
```
- [ ] Shows terminal with output
- [ ] App launches correctly
- [ ] All dependencies found

## Verification on Fresh Machine (Optional but Recommended)

Before shipping, test on a machine where:
- [ ] This app has never been installed before
- [ ] You have a fresh Python and Node.js install (or delete venv/node_modules first)

Steps:
```bash
# From project root
rm -r web\venv web\node_modules

# Now run the launcher - it should install everything fresh
.\Launch-App.ps1
```

- [ ] First run takes ~15-20 seconds
- [ ] All dependencies install successfully
- [ ] App launches without intervention
- [ ] Second run is much faster (~5-10 seconds)

## Production Readiness Checklist

Before giving the app to users:

- [ ] Electron builds without warnings
- [ ] Both launcher scripts work (.ps1 and .vbs)
- [ ] App starts within 15 seconds on first run
- [ ] All your React UI elements are visible and functional
- [ ] Backend API calls work correctly
- [ ] Closing the window properly cleans up processes
- [ ] No error messages in console/terminal on normal usage
- [ ] README_ELECTRON.md has been read and looks complete

## Known Issues to Check

- [ ] Check that `web/main.py` exists and is in the right place
- [ ] Check that `web/requirements.txt` exists
- [ ] Check that `web/vite.config.js` has build output configured
- [ ] Check that `electron-main.js` is in project root

## Distribution Checklist

When ready to share with users:

- [ ] You have built the production app (`npm run build:electron`)
- [ ] You have the `.exe` file from `web/dist/`
- [ ] You've created a release tag in git (`git tag v0.1.0`)
- [ ] You've documented any setup requirements in README_ELECTRON.md
- [ ] You've tested the `.exe` launcher on a clean machine (optional)

## File Structure Verification

Verify these files exist in the project root:

```
✓ electron-main.js              (Electron main process)
✓ preload.js                    (Security preload script)
✓ Launch-App.ps1                (PowerShell launcher)
✓ Launch-App.bat                (Batch launcher)
✓ Launch-App.vbs                (VBScript launcher)
✓ README_ELECTRON.md            (Full documentation)
✓ ELECTRON_SETUP.md             (Setup guide)
✓ ELECTRON_SETUP_SUMMARY.md     (What was created)
✓ QUICK_START.txt               (Quick start guide)
✓ VERIFICATION_CHECKLIST.md     (This file)
```

And in `web/`:

```
✓ package.json                  (Updated with Electron config)
✓ vite.config.js                (Updated build config)
✓ main.py                       (FastAPI backend)
✓ requirements.txt              (Python dependencies)
✓ src/                          (React components)
✓ dist/                         (Built files, after npm run build)
```

## Package.json Verification

In `web/package.json`, verify these exist:

```json
{
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev:api\" \"wait-on http://localhost:8002 && electron .\"",
    "build:electron": "vite build && electron-builder"
  },
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^25.0.0",
    "electron-is-dev": "^2.0.0"
  },
  "build": {
    "appId": "com.blackline.resumegenerator",
    "productName": "Resume Generator",
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

- [ ] All scripts present
- [ ] All dependencies listed
- [ ] Build config for Windows present

## Performance Benchmarks

After verification, these should be your benchmarks:

| Scenario | Time | Status |
|----------|------|--------|
| First launch (full setup) | ~15s | ✓ Normal |
| Subsequent launches | ~5-10s | ✓ Fast |
| React UI load time | <2s | ✓ Instant |
| Backend response time | <1s | ✓ Quick |
| Build electron app | ~30s | ✓ Acceptable |

## Final Sign-Off

- [ ] All steps above completed
- [ ] No errors or warnings
- [ ] App is production-ready
- [ ] Ready to share with users

---

## Troubleshooting During Verification

If you hit issues, check:

1. **npm ERR! code ERESOLVE**
   - Use `npm install --legacy-peer-deps`

2. **Port 8002 in use**
   - `netstat -ano | findstr :8002` then `taskkill /PID <PID> /F`

3. **Module not found**
   - Delete `web/node_modules` and reinstall
   - Delete `web/venv` and recreate

4. **Electron won't open**
   - Check backend is running
   - Check port 8002 is accessible
   - Check Vite is compiling (in dev mode)

5. **PowerShell execution policy**
   - `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process`

---

**When all checkmarks are done, your app is ready for distribution!** 🎉
