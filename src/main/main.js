const { app, BrowserWindow, ipcMain } = require('electron')
const { initWindow } = require('./utils')
const { disableProxy, proxyStatus } = require('./module/system-proxy')
require('./getData')
require('./excel')
require('./UIGFJson')
// require('./gists')
const { getUpdateInfo } = require('./update/index')

const isDev = !app.isPackaged
let win = null

function createWindow() {
  win = initWindow()
  win.setMenuBarVisibility(false)
  isDev ? win.loadURL(`http://localhost:${process.env.PORT}`) : win.loadFile('dist/electron/renderer/index.html')
  if (isDev) {
    win.webContents.openDevTools({ mode: 'undocked', activate: true })
  }
}

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(createWindow)

  ipcMain.handle('RELAUNCH', async () => {
    app.relaunch()
    app.exit(0)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('will-quit', (e) => {
    if (proxyStatus.started) {
      disableProxy()
    }
    if (getUpdateInfo().status === 'moving') {
      e.preventDefault()
      setTimeout(() => {
        app.quit()
      }, 3000)
    }
  })

  app.on('quit', () => {
    if (proxyStatus.started) {
      disableProxy()
    }
  })
}

