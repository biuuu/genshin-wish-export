const fs = require('fs-extra')
const path = require('path')
const { app, ipcMain } = require('electron')
const axios = require('axios')
const main =  require('./main')

let GachaTypesUrl
let GachaLogBaseUrl
let uid = 0
const sendMsg = (text) => {
  const win = main.getWin()
  if (win) {
    win.webContents.send('LOAD_DATA_STATUS', text)
  }
}

const detectGameLocale = async (userPath) => {
  let name = '原神'
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', 'Genshin Impact/output_log.txt'), fs.constants.F_OK)
    name = 'Genshin Impact'
  } catch (e) {}
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', '原神/output_log.txt'), fs.constants.F_OK)
    name = '原神'
  } catch (e) {}
  return name
}

const saveData = async (data) => {
  const userDataPath = app.getPath('userData')
  data.result = [...data.result]
  if (uid) {
    await fs.outputJSON(`${userDataPath}/gacha-list-${uid}.json`, data)
  }
  await fs.outputJSON(`${userDataPath}/gacha-listjson`, data)
}

const readData = async () => {
  const userDataPath = app.getPath('userData')
  try {
    const obj = await fs.readJSON(`${userDataPath}/gacha-list${uid ? `-${uid}` : ''}.json`)
    obj.result = new Map(obj.result)
    return obj
  } catch (e) {
    return false
  }
}

const mergeData = (local, origin) => {
  if (local) {
    const localSet = new Set()
    for (let [key, value] of local) {
      for (let item of value) {
        localSet.add(`${key}-${item.join('-')}`)
      }
    }
    for (let [key, value] of origin) {
      for (let item of value) {
        if (!localSet.has(`${key}-${item.join('-')}`)) {
          if (!local.has(key)) {
            local.set(key, [])
          }
          local.get(key).push(item)
        }
      }
    }
    return local
  }
  return origin
}

const readLog = async () => {
  try {
    const userPath = app.getPath('home')
    const gameName = await detectGameLocale(userPath)
    const logText = await fs.readFile(`${userPath}/AppData/LocalLow/miHoYo/${gameName}/output_log.txt`, 'utf8')
    const arr = logText.match(/^OnGetWebViewPageFinish:https:\/\/.+\?.+?(?:#.+)?$/mg)
    if (arr && arr.length) {
      return arr[arr.length - 1].match(/\?([^?]+?)(#.+)?$/)[1]
    } else {
      sendMsg('未找到URL')
      return false
    }
  } catch (e) {
    sendMsg('读取日志失败')
    return false
  }
}

const getGachaLog = async (key, page) => {
  const res = await axios.get(
    GachaLogBaseUrl + `&gacha_type=${key}` + `&page=${page}` + `&size=${20}`
  )
  return res.data.data.list
}

const getGachaLogs = async (name, key) => {
  let page = 1
  let data = []
  let res = []
  do {
    sendMsg(`正在获取${name}第${page}页`)
    res = await getGachaLog(key, page)
    if (!uid && res.length) {
      uid = res[0].uid
    }
    data.push(...res)
    page += 1
  } while (res.length > 0)
  return data
}

const order = ['角色活动祈愿', '武器活动祈愿', '常驻祈愿', '新手祈愿']
const getData = async () => {
  const result = new Map()
  const queryString = await readLog()
  if (!queryString) {
    return false
  }
  GachaTypesUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
  GachaLogBaseUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?${queryString}`
  sendMsg('正在获取抽卡活动类型')
  const gachaTypes = (await axios.get(GachaTypesUrl)).data.data.gacha_type_list
  const orderedGachaTypes = []
  order.forEach(name => {
    const index = gachaTypes.findIndex(item => item.name === name)
    if (index !== -1)  {
      orderedGachaTypes.push(gachaTypes.splice(index, 1)[0])
    }
  })
  orderedGachaTypes.push(...gachaTypes)
  sendMsg('获取抽卡活动类型成功')
  for (const type of orderedGachaTypes) {
    const logs = (await getGachaLogs(type.name, type.key)).map((item) => {
      return [item.time, item.name, item.item_type, parseInt(item.rank_type)]
    })
    logs.reverse()
    result.set(type.name, logs)
  }
  const data = { result, time: Date.now() }
  const localData = await readData()
  const mergedResult = mergeData(localData ? localData.result : false, result)
  data.result = mergedResult
  saveData(data)
  return data
}

ipcMain.handle('FETCH_DATA', async () => {
  try {
    const data = await getData()
    return data
  } catch (e) {

  }
  return false
})

ipcMain.handle('READ_DATA', async () => {
  const data = await readData()
  return data
})

exports.readData = readData