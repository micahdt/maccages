const { app, BrowserWindow, ipcMain, Notification, nativeImage, nativeTheme, shell, Menu, session } = require('electron');
const path = require('path');

let mainWindow;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Maccages',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#202124',
    icon: path.join(__dirname, 'macages-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false, // Required to override window.Notification directly
      nodeIntegration: false
    }
  });

  mainWindow.loadURL('https://messages.google.com/web');

  mainWindow.on('close', (event) => {
    // Hide the window instead of destroying it when the red X is clicked
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  mainWindow.loadURL('https://messages.google.com/web/');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com') || url.includes('google.com/accounts') || url.includes('myaccount.google.com')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: undefined
          }
        }
      };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isGoogleMessages = url.includes('messages.google.com');
    const isGoogleAuth = url.includes('accounts.google.com');
    
    if (!isGoogleMessages && !isGoogleAuth && url.startsWith('http')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('page-title-updated', (event) => {
    // Prevent the web page from overriding our custom window title!
    event.preventDefault();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Convert the entire body into a locked coordinate space. By pushing it down 35px 
    // and using translateZ(0), it traps ALL fixed position elements (even Angular sidebars) below the dragbar.
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.style.backgroundColor = '#202124';
      document.body.style.margin = '0';
      document.body.style.marginTop = '35px';
      document.body.style.height = 'calc(100vh - 35px)';
      document.body.style.transform = 'translateZ(0)';
      document.body.style.overflow = 'hidden';

      if (!document.getElementById('maccages-drag-bar')) {
        const dragBar = document.createElement('div');
        dragBar.id = 'maccages-drag-bar';
        dragBar.style.position = 'fixed';
        dragBar.style.top = '-35px'; // Sits securely in the margin space above the body
        dragBar.style.left = '0';
        dragBar.style.width = '100%';
        dragBar.style.height = '35px';
        dragBar.style.backgroundColor = '#202124';
        dragBar.style.webkitAppRegion = 'drag';
        dragBar.style.zIndex = '999999';
        document.body.appendChild(dragBar);
      }
    `);
  });
  
  console.log('Main window created');
}

app.on('before-quit', () => {
  isQuitting = true;
});

// Spoof the User-Agent to act like standard Mozilla Firefox on macOS.
// This prevents the host service from detecting the Electron wrapper and bypassing its "Not Secure" bot detection.
app.userAgentFallback = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0";

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'macages-icon.png'));
  }
  
  // Sync Dark/Light Mode with System
  nativeTheme.themeSource = 'system';
  
  // Enable Auto-Launch on Startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  });
  
  // Enable native macOS spellchecker
  session.defaultSession.setSpellCheckerLanguages(['en-US']);
  
  // Set the macOS "About Maccages" panel natively
  app.setAboutPanelOptions({
    applicationName: 'Maccages',
    applicationVersion: '1.0.0',
    version: '1.0.0',
    copyright: 'Copyright © 2026 micah',
    authors: ['micah'],
    iconPath: path.join(__dirname, 'macages-icon.png')
  });

  createWindow();
  
  // Minimal Context Menu specifically for catching misspelled words
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      const template = params.dictionarySuggestions.map(suggestion => ({
        label: suggestion,
        click: () => mainWindow.webContents.replaceMisspelling(suggestion)
      }));
      template.push({ type: 'separator' });
      template.push({
        label: 'Add to Dictionary',
        click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      });
      Menu.buildFromTemplate(template).popup();
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });

  // Build the native macOS Application Menu to ensure keyboard shortcuts function flawlessly
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('debug-log', (event, ...args) => {
  console.log('[DEBUG-PRELOAD]', ...args);
});

ipcMain.on('update-badge', (event, count) => {
  app.setBadgeCount(count);
});

let pendingReplies = new Map();

// IPC handler for custom notifications
let replyWindow = null;
let currentReplyConversationId = null;

ipcMain.on('show-notification', async (event, { title, body, conversationId }) => {
  const notification = new Notification({
    title: title,
    body: body,
    hasReply: true,
    silent: false
  });

  notification.on('reply', (event, reply) => {
    console.log('[DEBUG-MAIN] Notification reply received from OS!', reply);
    mainWindow.webContents.send('prepare-reply', { conversationId, replyText: reply });
  });

  notification.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
    app.focus({ steal: true });
    mainWindow.webContents.send('open-conversation', { conversationId });
  });

  notification.show();
});

ipcMain.on('trigger-native-enter', () => {
  console.log('[DEBUG-MAIN] Triggering native OS-level Enter keystroke');
  if (mainWindow) {
    mainWindow.webContents.focus();
    mainWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
    mainWindow.webContents.sendInputEvent({ type: 'char', keyCode: 'Enter' });
    mainWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
  }
});


