import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import Store from 'electron-store'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize electron store for app settings
const store = new Store({
  defaults: {
    windowBounds: {
      width: 1400,
      height: 900,
      x: undefined,
      y: undefined
    },
    theme: 'system',
    autoUpdates: true
  }
})

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

const isDev = process.env.NODE_ENV === 'development'
const isWin = process.platform === 'win32'

async function createWindow(): Promise<void> {
  // Get saved window bounds
  const bounds = store.get('windowBounds') as any
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    icon: join(__dirname, '../assets/icon.png'), // We'll add this later
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: !isDev
    },
    titleBarStyle: isWin ? 'default' : 'hiddenInset',
    autoHideMenuBar: !isDev
  })

  // Save window bounds when they change
  mainWindow.on('resize', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  })

  mainWindow.on('move', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  })

  // Load the appropriate URL
  if (isDev) {
    // Development: load from Vite dev server
    await mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // Production: load from built files
    await mainWindow.loadFile(join(__dirname, '../../frontend/dist/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

async function startBackendServer(): Promise<void> {
  if (isDev) {
    // In development, assume backend is started separately
    console.log('Development mode: assuming backend is running on port 3001')
    return
  }

  // In production, start the backend process
  const backendPath = join(__dirname, '../../backend/dist/index.js')
  
  backendProcess = spawn('node', [backendPath], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3001'
    }
  })

  backendProcess.stdout?.on('data', (data) => {
    console.log(`Backend: ${data}`)
  })

  backendProcess.stderr?.on('data', (data) => {
    console.error(`Backend Error: ${data}`)
  })

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`)
  })
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Configuración',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('navigate', '/settings')
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: isWin ? 'Ctrl+Q' : 'Cmd+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow?.webContents.send('navigate', '/')
          }
        },
        {
          label: 'Watchlist',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow?.webContents.send('navigate', '/watchlist')
          }
        },
        {
          label: 'Portfolio',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow?.webContents.send('navigate', '/portfolio')
          }
        },
        {
          label: 'Objetivos',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow?.webContents.send('navigate', '/goals')
          }
        },
        { type: 'separator' },
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
      label: 'Ventana',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de CEDEARs Manager',
          click: () => {
            // Show about dialog
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Acerca de CEDEARs Manager',
              message: 'CEDEARs Manager v1.0.0',
              detail: 'Gestión inteligente de cartera de CEDEARs con criterios ESG/veganos'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(async () => {
  console.log('🚀 Starting CEDEARs Manager...')
  
  // Start backend server
  await startBackendServer()
  
  // Create main window
  await createWindow()
  
  // Create application menu
  createMenu()
  
  console.log('✅ CEDEARs Manager ready!')
})

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill()
  }
  
  // Quit app except on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  // Re-create window on macOS when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('store-get', (_, key) => {
  return store.get(key)
})

ipcMain.handle('store-set', (_, key, value) => {
  return store.set(key, value)
})

// Handle app updates
ipcMain.handle('check-for-updates', async () => {
  // Auto-updater implementation will be added later
  return { available: false }
})