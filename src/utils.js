const fs = require('fs-extra')
const path = require('path')
const fetch = require('electron-fetch').default
const { BrowserWindow, app } = require('electron')

const isDev = !app.isPackaged
let win = null
const initWindow = () => {
  win = new BrowserWindow({
    width: 888,
    height: 550,
    webPreferences: {
      nodeIntegration: true
    }
  })
  return win
}

const sendMsg = (text, type = 'LOAD_DATA_STATUS') => {
  if (win) {
    win.webContents.send(type, text)
  }
}

const request = async (url) => {
  const res = await fetch(url)
  return await res.json()
}

const sleep = (sec = 1) => {
  return new Promise(rev => {
    setTimeout(rev, sec * 1000)
  })
}

const detectGameLocale = async (userPath) => {
  const result = []
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', '原神/output_log.txt'), fs.constants.F_OK)
    result.push('原神')
  } catch (e) {}
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', 'Genshin Impact/output_log.txt'), fs.constants.F_OK)
    result.push('Genshin Impact')
  } catch (e) {}
  return result
}

const userDataPath = app.getPath('userData')
const appPath = isDev ? path.resolve(__dirname, '..', 'userData') : path.resolve(app.getAppPath(), '..', '..', 'userData')
const saveJSON = async (name, data) => {
  try {
    await fs.outputJSON(path.join(userDataPath, name), data)
  } catch (e) {}
  try {
    await fs.outputJSON(path.join(appPath, name), data)
  } catch (e) {
    sendMsg('保存本地数据失败')
    sendMsg(e, 'ERROR')
    await sleep(3)
  }
}

const readJSON = async (name) => {
  let data = null
  try {
    data = await fs.readJSON(path.join(appPath, name))
  } catch (e) {}
  if (data) return data
  try {
    data = await fs.readJSON(path.join(userDataPath, name))
  } catch (e) {}
  return data
}

module.exports = { sleep, request, detectGameLocale, sendMsg, readJSON, saveJSON, initWindow }