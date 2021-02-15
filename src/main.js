const { app, BrowserWindow } = require('electron')
require('./getData')
require('./excel')

const isDev = !app.isPackaged
let win = null

function createWindow () {
  win = new BrowserWindow({
    width: 880,
    height: 540,
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.setMenuBarVisibility(false)
  isDev ? win.loadURL(`http://localhost:3000`) : win.loadFile('./dist/index.html')
}

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

const getWin = () => win

exports.getWin = getWin