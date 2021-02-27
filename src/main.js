const path = require('path')
const fs = require('fs-extra')
const { app, BrowserWindow } = require('electron')
const { initWindow, saveLog } = require('./utils')
const { disableProxy, proxyStatus } = require('./module/system-proxy')
require('./getData')
require('./excel')
const { getUpdateInfo } = require('./update/index')

const isDev = !app.isPackaged
let win = null

function createWindow () {
  win = initWindow()
  win.setMenuBarVisibility(false)
  isDev ? win.loadURL(`http://localhost:3000`) : win.loadFile('./dist/index.html')
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

  app.on('will-quit', () => {
    if (proxyStatus.started) {
      disableProxy()
    }
  })

  app.on('quit', () => {
    if (proxyStatus.started) {
      disableProxy()
    }
  })
}

