const path = require('path')
const fs = require('fs-extra')
const { app, BrowserWindow } = require('electron')
const { initWindow, appRoot } = require('./utils')
const { fork } = require('child_process')
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
    if (isDev) return
    const info = getUpdateInfo()
    if (!info.exist) return
    const moveFileJSPath = path.resolve(info.dirname, 'move-file.js')
    fs.outputFileSync(moveFileJSPath, `
    const ofs = require('original-fs')
    const fs = require('fs-extra')
    const path = require('path')
    process.noAsar = true
    const { dirname, filename, appRoot } = process.env
    const start = () => {
      const resPath = path.resolve(appRoot, 'resources')
      ofs.copyFile(path.resolve(dirname, filename), path.resolve(resPath, filename), (err) => {
        if (err) {
          fs.outputFileSync(path.resolve(dirname, 'error.txt'), err)
          throw err
        }
      })
    }
    setTimeout(start, 5000)`)
    fork(moveFileJSPath, {
      detached: true,
      env: Object.assign(info, {
        appRoot
      })
    })
  })
}

