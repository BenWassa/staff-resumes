import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import process from 'node:process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const BACKEND_PORT = 8002;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const APP_ID = 'com.blackline.resumegenerator';

let mainWindow;
let pythonProcess;
let isQuitting = false;
let ownsBackendProcess = false;
let backendStartupFinished = false;
let backendStderrBuffer = '';
let backendStartupErrorMessage = '';

const getWindowIconPath = () =>
  isDev
    ? path.resolve(__dirname, '../public/BLC_nobg.ico')
    : path.join(process.resourcesPath, 'assets', 'BLC_nobg.ico');

const stopPythonBackend = () => {
  if (!ownsBackendProcess || !pythonProcess || pythonProcess.killed) {
    return;
  }
  pythonProcess.kill();
};

const canReachBackend = (timeoutMs = 1000) =>
  new Promise((resolve) => {
    const request = http.get(`${BACKEND_URL}/api/projects`, (response) => {
      response.resume();
      resolve(true);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });

const waitForBackendReady = (timeoutMs = 25000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      canReachBackend().then((isReady) => {
        if (isReady) {
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          reject(
            new Error(
              backendStartupErrorMessage ||
                `Backend did not start at ${BACKEND_URL} within ${timeoutMs}ms.`
            )
          );
          return;
        }
        setTimeout(attempt, 350);
      });
    };

    attempt();
  });

const getBackendLaunchConfig = () => {
  if (isDev) {
    const repoRoot = path.resolve(__dirname, '..');
    return {
      appModule: 'web.main:app',
      appDir: repoRoot,
      cwd: repoRoot,
      env: {},
    };
  }

  const pythonRoot = path.join(process.resourcesPath, 'python');
  const userDataRoot = path.join(app.getPath('documents'), 'Resume Generator');
  return {
    appModule: 'web.main:app',
    appDir: pythonRoot,
    cwd: pythonRoot,
    env: {
      ALLOW_EXTERNAL_PATHS: 'true',
      LOCAL_OUTPUTS_ROOT: path.join(userDataRoot, 'outputs'),
      LOCAL_PURSUITS_ROOT: path.join(userDataRoot, 'pursuits_local'),
    },
  };
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/renderer/index.html'));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });
};

const startPythonBackend = () => {
  const launchConfig = getBackendLaunchConfig();
  ownsBackendProcess = true;
  backendStderrBuffer = '';
  backendStartupErrorMessage = '';
  pythonProcess = spawn(
    'python',
    [
      '-m',
      'uvicorn',
      launchConfig.appModule,
      '--host',
      BACKEND_HOST,
      '--port',
      String(BACKEND_PORT),
      '--app-dir',
      launchConfig.appDir,
    ],
    {
      cwd: launchConfig.cwd,
      env: {
        ...process.env,
        ...launchConfig.env,
      },
      stdio: 'pipe',
    }
  );

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    backendStderrBuffer += data.toString();
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on('error', (error) => {
    dialog.showErrorBox(
      'Backend Error',
      `Failed to start Python backend: ${error.message}`
    );
  });

  pythonProcess.on('exit', (code, signal) => {
    if (isQuitting || code === 0 || code === null) {
      return;
    }
    const stderr = backendStderrBuffer.trim();
    const portConflict =
      stderr.includes('address already in use') ||
      stderr.includes('Only one usage of each socket address') ||
      stderr.includes('WinError 10048') ||
      stderr.includes('Errno 10048');
    const detailedMessage = portConflict
      ? `Port ${BACKEND_PORT} is already in use. Close the other Resume Generator/backend process and try again.`
      : stderr || `Python backend exited unexpectedly (code: ${code}, signal: ${signal ?? 'none'}).`;

    backendStartupErrorMessage = detailedMessage;
    if (!backendStartupFinished) {
      return;
    }
    dialog.showErrorBox(
      'Backend Error',
      detailedMessage
    );
  });
};

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select your Pursuits folder',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

app.on('ready', async () => {
  app.setAppUserModelId(APP_ID);
  try {
    if (!(await canReachBackend())) {
      startPythonBackend();
    }
    await waitForBackendReady();
    backendStartupFinished = true;
    createWindow();
  } catch (error) {
    backendStartupFinished = true;
    dialog.showErrorBox(
      'Startup Error',
      `Resume Generator could not start the backend.\n\n${error.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopPythonBackend();
});

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
          ],
        },
      ]
    : []),
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
