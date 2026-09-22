/**
 * Mailops Native macOS Desktop Shell (Electron + Vibrancy Glassmorphism)
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Native macOS traffic lights integration
    vibrancy: 'under-window',     // Native macOS blur glassmorphism effect
    visualEffectState: 'active',
    backgroundColor: '#00000000', // Transparent for glassmorphism
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Load the built Vite web app
  mainWindow.loadFile(path.join(__dirname, '../web/dist/index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
