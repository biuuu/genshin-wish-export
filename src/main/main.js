const path = require('path')
const fs = require('fs-extra')
const { app, BrowserWindow } = require('electron')
const { initWindow } = require('./utils')
const { disableProxy, proxyStatus } = require('./module/system-proxy')
require('./getData')
require('./excel')
const { getUpdateInfo } = require('./update/index')

const isDev = !app.isPackaged
let win = null

function createWindow() {
  win = initWindow()
  win.setMenuBarVisibility(false)
  isDev ? win.loadURL(`http://localhost:9080`) : win.loadFile('dist/electron/renderer/index.html')
  if (isDev) {
    // const electronDevtoolsInstaller = require('electron-devtools-installer').default
    win.webContents.openDevTools({ mode: 'undocked', activate: true })
    // electronDevtoolsInstaller('ljjemllljcmogpfapbkkighbhhppjdbg', true)
    //   .then((name) => console.log(`已安装: ${name}`))
    //   .catch(err => console.log('无法安装 `vue-devtools`: \n 可能发生的错误：网络连接问题 \n', err))
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

