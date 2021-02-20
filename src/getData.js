const fs = require('fs-extra')
const path = require('path')
const { URL } = require('url')
const { app, ipcMain } = require('electron')
const fetch = require('electron-fetch').default
const main =  require('./main')

const order = ['301', '302', '200', '100']
const isDev = !app.isPackaged

let GachaTypesUrl
let GachaLogBaseUrl
let uid = 0
let lang = ''
let localData = null
const sendMsg = (text) => {
  const win = main.getWin()
  if (win) {
    win.webContents.send('LOAD_DATA_STATUS', text)
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

const saveData = async (data) => {
  const obj = Object.assign({}, data)
  const userDataPath = app.getPath('userData')
  const appPath = isDev ? path.resolve(__dirname, '..') : path.resolve(app.getAppPath(), '..', '..')
  obj.result = [...obj.result]
  obj.typeMap = [...obj.typeMap]
  try {
    if (uid) {
      await fs.outputJSON(`${userDataPath}/gacha-list-${uid}.json`, obj)
      await fs.outputJSON(`${appPath}/userData/gacha-list-${uid}.json`, obj)
    }
    await fs.outputJSON(`${userDataPath}/gacha-list.json`, obj)
    await fs.outputJSON(`${appPath}/userData/gacha-list.json`, obj)
  } catch (e) {
    sendMsg('保存本地数据失败')
    console.error(e)
    await sleep(3)
  }
}

const itemTypeFixMap = new Map([
  ['角色活动祈愿', '301'],
  ['武器活动祈愿', '302'],
  ['常驻祈愿', '200'],
  ['新手祈愿', '100']
])

const defaultTypeMap = new Map([
  ['301', '角色活动祈愿'],
  ['302', '武器活动祈愿'],
  ['200', '常驻祈愿'],
  ['100', '新手祈愿']
])

const readData = async () => {
  const userDataPath = app.getPath('userData')
  const appPath = app.getAppPath()
  try {
    let obj = null
    try {
      obj = await fs.readJSON(`${appPath}/userData/gacha-list${uid ? `-${uid}` : ''}.json`)
    } catch (e) {}
    if (!obj) {
      obj = await fs.readJSON(`${userDataPath}/gacha-list${uid ? `-${uid}` : ''}.json`)
    }
    obj.result.forEach(item => {
      if (itemTypeFixMap.has(item[0])) {
        item[0] = itemTypeFixMap.get(item[0])
      }
    })
    obj.typeMap = obj.typeMap ? new Map(obj.typeMap) : defaultTypeMap
    obj.result = new Map(obj.result)
    localData = obj
    return obj
  } catch (e) {
    return false
  }
}

const mergeData = (local, origin) => {
  if (local && local.result) {
    const localResult = local.result
    const localUid = local.uid
    const originResult = origin.result
    const originUid = origin.uid
    const localSet = new Set()
    for (let [key, value] of localResult) {
      for (let item of value) {
        localSet.add(`${key}-${item[0]}-${localUid || '0' }`)
      }
    }
    for (let [key, value] of originResult) {
      for (let item of value) {
        if (!localSet.has(`${key}-${item[0]}-${localUid ? originUid : '0' }`)) {
          if (!localResult.has(key)) {
            localResult.set(key, [])
          }
          localResult.get(key).push(item)
        }
      }
    }
    return localResult
  }
  return origin.result
}

const readLog = async () => {
  try {
    const userPath = app.getPath('home')
    const gameNames = await detectGameLocale(userPath)
    if (!gameNames.length) {
      sendMsg('未找到游戏日志，确认是否已打开游戏抽卡记录')
      return false
    }
    const promises = gameNames.map(async name => {
      const logText = await fs.readFile(`${userPath}/AppData/LocalLow/miHoYo/${name}/output_log.txt`, 'utf8')
      const arr = logText.match(/^OnGetWebViewPageFinish:https:\/\/.+\?.+?(?:#.+)?$/mg)
      if (arr && arr.length) {
        return arr[arr.length - 1].replace('OnGetWebViewPageFinish:', '')
      }
    })
    const result = await Promise.all(promises)
    for (let url of result) {
      if (url) {
        return url
      }
    }
    sendMsg('未找到URL')
    return false
  } catch (e) {
    sendMsg('读取日志失败')
    return false
  }
}

const getGachaLog = async (key, page, name, retryCount = 5) => {
  try {
    const res = await request(
      GachaLogBaseUrl + `&gacha_type=${key}` + `&page=${page}` + `&size=${20}`
    )
    return res.data.list
  } catch (e) {
    if (retryCount) {
      sendMsg(`获取${name}第${page}页失败，5秒后进行第${6 - retryCount}次重试……`)
      await sleep(5)
      retryCount--
      return await getGachaLog(key, page, name, retryCount)
    } else {
      sendMsg(`获取${name}第${page}页失败，已超出重试次数`)
      throw e
    }
  }
}

const getGachaLogs = async (name, key) => {
  let page = 1
  let data = []
  let res = []
  do {
    if (page % 10 === 0) {
      sendMsg(`正在获取${name}第${page}页，每10页休息1秒……`)
      await sleep(1)
    }
    sendMsg(`正在获取${name}第${page}页`)
    res = await getGachaLog(key, page, name)
    if (!uid && res.length) {
      uid = res[0].uid
    }
    data.push(...res)
    page += 1
  } while (res.length > 0)
  return data
}

const getData = async () => {
  const result = new Map()
  const typeMap = new Map()
  const url = await readLog()
  if (!url) return false
  const { searchParams } = new URL(url)
  if (!searchParams.get('authkey')) {
    sendMsg('没能从URL中获取到authkey')
    return false
  }
  if (localData && localData.lang) {
    searchParams.set('lang', locaoData.lang)
  }
  lang = searchParams.get('lang')
  const queryString = searchParams.toString()
  GachaTypesUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
  GachaLogBaseUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?${queryString}`
  sendMsg('正在获取抽卡活动类型')
  const res = await request(GachaTypesUrl)
  if (res.retcode !== 0) {
    sendMsg(res.message)
    return false
  }
  const gachaTypes = res.data.gacha_type_list
  const orderedGachaTypes = []
  order.forEach(key => {
    const index = gachaTypes.findIndex(item => item.key === key)
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
    typeMap.set(type.key, type.name)
    result.set(type.key, logs)
  }
  const data = { result, time: Date.now(), typeMap, uid, lang }
  await readData()
  const mergedResult = mergeData(localData, data)
  data.result = mergedResult
  await saveData(data)
  return data
}

ipcMain.handle('FETCH_DATA', async () => {
  try {
    const data = await getData()
    return data
  } catch (e) {
    const win = main.getWin()
    if (win) {
      win.webContents.send('ERROR', e)
    }
    console.error(e)
  }
  return false
})

ipcMain.handle('READ_DATA', async () => {
  const data = await readData()
  return data
})

exports.readData = readData