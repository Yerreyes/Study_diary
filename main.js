const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:5173');
}

app.on('ready', () => {
  const clientPath = path.join(__dirname, 'client');

  if (!require('fs').existsSync(clientPath)) {
    console.error(`Client directory not found at ${clientPath}`);
    app.quit();
    return;
  }

  const clientServer = exec('npm run start', { cwd: clientPath });

  clientServer.stdout.on('data', (data) => {
    console.log(data.toString());
    if (data.toString().includes('Local:')) {
      createWindow();
    }
  });

  clientServer.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  clientServer.on('close', (code) => {
    console.log(`Client server exited with code ${code}`);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});