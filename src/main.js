const { app, BrowserWindow } = require('electron')
const { initWindow } = require('./utils')
require('./getData')
require('./excel')

const isDev = !app.isPackaged

function createWindow () {
  const win = initWindow()
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