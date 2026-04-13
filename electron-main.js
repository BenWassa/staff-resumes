import { app, BrowserWindow, Menu, dialog } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let pythonProcess;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5174'
    : `file://${path.join(__dirname, 'web/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Kill Python backend on window close
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });
};

const startPythonBackend = () => {
  // In production (built app), main.py is in the app root
  // In development, main.py is in web/ directory
  const webDir = isDev ? path.join(__dirname, 'web') : __dirname;

  pythonProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8002'], {
    cwd: webDir,
    stdio: 'pipe',
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on('error', (error) => {
    dialog.showErrorBox(
      'Backend Error',
      `Failed to start Python backend: ${error.message}`
    );
  });
};

app.on('ready', () => {
  startPythonBackend();

  // Wait a moment for Python to start, then open the window
  setTimeout(createWindow, 1000);
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
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Create a simple app menu
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
