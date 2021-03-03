const fs = require('fs-extra')
const path = require('path')
const fetch = require('electron-fetch').default
const { BrowserWindow, app } = require('electron')
const crypto = require('crypto')
const unhandled = require('electron-unhandled')

const isDev = !app.isPackaged

const appRoot = isDev ? path.resolve(__dirname, '..', '..') : path.resolve(app.getAppPath(), '..', '..')
const userDataPath = path.resolve(appRoot, 'userData')
const userPath = app.getPath('userData')

let win = null
const initWindow = () => {
  win = new BrowserWindow({
    width: 888,
    height: 550,
    webPreferences: {
      contextIsolation:false,
      nodeIntegration: true
    }
  })
  return win
}

const getWin = () => win

const log = []
const sendMsg = (text, type = 'LOAD_DATA_STATUS') => {
  if (win) {
    win.webContents.send(type, text)
  }
  if (type !== 'LOAD_DATA_STATUS') {
    log.push([Date.now(), type, text])
    saveLog()
  }
}

const saveLog = () => {
  const text = log.map(item => {
    const time = new Date(item[0]).toLocaleString()
    const type = item[1] === 'LOAD_DATA_STATUS' ? 'INFO' : item[1]
    const text = item[2]
    return `[${type}][${time}]${text}`
  }).join('\r\n')
  fs.outputFileSync(path.join(userDataPath, 'log.txt'), text)
}

const authkeyMask = (text = '') => {
  return text.replace(/authkey=[^&]+&/g, 'authkey=***&')
}

unhandled({
  showDialog: false,
  logger: function (err) {
    log.push([Date.now(), 'ERROR', authkeyMask(err.stack)])
    saveLog()
  }
})

const request = async (url) => {
  const res = await fetch(url, {
    timeout: 15 * 1000
  })
  return await res.json()
}

const sleep = (sec = 1) => {
  return new Promise(rev => {
    setTimeout(rev, sec * 1000)
  })
}

const sortData = (data) => {
  return data.map(item => {
    const [time, name, type, rank] = item
    return {
      time, name, type, rank,
      timestamp: new Date(time)
    }
  }).sort((a, b) => a.timestamp - b.timestamp)
  .map(item => {
    const { time, name, type, rank } = item
    return [time, name, type, rank]
  })
}

const langMap = new Map([
  ['zh-cn', '简体中文'],
  ['zh-tw', '繁體中文'],
  ['de-de', 'Deutsch'],
  ['en-us', 'English'],
  ['es-es', 'Español'],
  ['fr-fr', 'Français'],
  ['id-id', 'Indonesia'],
  ['ja-jp', '日本語'],
  ['ko-kr', '한국어'],
  ['pt-pt', 'Português'],
  ['ru-ru', 'Pусский'],
  ['th-th', 'ภาษาไทย'],
  ['vi-vn', 'Tiếng Việt']
])

const localeMap = new Map([
  ['zh-cn', ['zh', 'zh-CN']],
  ['zh-tw', ['zh-TW']],
  ['de-de', ['de-AT', 'de-CH', 'de-DE', 'de']],
  ['en-us', ['en-AU', 'en-CA', 'en-GB', 'en-NZ', 'en-US', 'en-ZA', 'en']],
  ['es-es', ['es', 'es-419']],
  ['fr-fr', ['fr-CA', 'fr-CH', 'fr-FR', 'fr']],
  ['id-id', ['id']],
  ['ja-jp', ['ja']],
  ['ko-kr', ['ko']],
  ['pt-pt', ['pt-BR', 'pt-PT', 'pt']],
  ['ru-ru', ['ru']],
  ['th-th', ['th']],
  ['vi-vn', ['vi']]
])

const detectLocale = () => {
  const locale = app.getLocale()
  let result = 'zh-cn'
  for (let [key, list] of localeMap) {
    if (list.includes(locale)) {
      result = key
      break
    }
  }
  return result
}

const detectGameLocale = async (userPath) => {
  const list = []
  const lang = app.getLocale()
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', '原神/output_log.txt'), fs.constants.F_OK)
    list.push('原神')
  } catch (e) {}
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', 'Genshin Impact/output_log.txt'), fs.constants.F_OK)
    list.push('Genshin Impact')
  } catch (e) {}
  if (lang !== 'zh-CN') {
    list.reverse()
  }
  return list
}

const saveJSON = async (name, data) => {
  try {
    await fs.outputJSON(path.join(userDataPath, name), data)
  } catch (e) {
    sendMsg('保存本地数据失败')
    sendMsg(e, 'ERROR')
    await sleep(3)
  }
}

const readJSON = async (name) => {
  let data = null
  try {
    data = await fs.readJSON(path.join(userDataPath, name))
  } catch (e) {}
  return data
}

const hash = (data, type = 'sha256') => {
  const hmac = crypto.createHmac(type, 'hk4e')
  hmac.update(data)
  return hmac.digest('hex')
}

const scryptKey = crypto.scryptSync(userPath, 'hk4e', 24)
const cipherAes = (data) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const cipher = crypto.createCipheriv(algorithm, scryptKey, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

const decipherAes = (encrypted) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const decipher = crypto.createDecipheriv(algorithm, scryptKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const  interfaces = require('os').networkInterfaces()
const localIp = () => {
  for (var devName in interfaces) {
    var iface = interfaces[devName]

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address
    }
  }
  return '127.0.0.1'
}

module.exports = {
  sleep, request, detectGameLocale, hash, cipherAes, decipherAes, saveLog,
  sendMsg, readJSON, saveJSON, initWindow, getWin, localIp, userPath, detectLocale, langMap,
  appRoot, userDataPath
}