const fs = require('fs-extra')
const util = require('util')
const path = require('path')
const { URL } = require('url')
const { app, ipcMain } = require('electron')
const { sleep, request, detectGameLocale, sendMsg, readJSON, saveJSON, userDataPath, localIp } = require('./utils')
const config = require('./config')
const { enableProxy, disableProxy } = require('./module/system-proxy')
const mitmproxy = require('node-mitmproxy')

const order = ['301', '302', '200', '100']

let gachaTypesUrl
let gachaLogUrl
let uid = 0
let lang = ''
let localData = null

// const saveData = async (data) => {
//   const obj = Object.assign({}, data)
//   obj.result = [...obj.result]
//   obj.typeMap = [...obj.typeMap]
//   await saveJSON(`gacha-list-${uid}.json`, obj)
//   await saveJSON('gacha-list.json', obj)
// }

// const itemTypeFixMap = new Map([
//   ['角色活动祈愿', '301'],
//   ['武器活动祈愿', '302'],
//   ['常驻祈愿', '200'],
//   ['新手祈愿', '100']
// ])

// const defaultTypeMap = new Map([
//   ['301', '角色活动祈愿'],
//   ['302', '武器活动祈愿'],
//   ['200', '常驻祈愿'],
//   ['100', '新手祈愿']
// ])

// const readData = async () => {
//   try {
//     const obj = await readJSON(`gacha-list${uid ? `-${uid}` : ''}.json`)
//     if (!obj) return false
//     obj.result.forEach(item => {
//       if (itemTypeFixMap.has(item[0])) {
//         item[0] = itemTypeFixMap.get(item[0])
//       }
//     })
//     obj.typeMap = obj.typeMap ? new Map(obj.typeMap) : defaultTypeMap
//     obj.result = new Map(obj.result)
//     localData = obj
//     return obj
//   } catch (e) {
//     return false
//   }
// }

// const mergeList = (a, b) => {
//   if (!a || !a.length) return b || []
//   if (!b || !b.length) return a
//   const minA = new Date(a[0][0]).getTime()
//   let pos = b.length
//   for (let i = 0 i < b.length i++) {
//     const time = new Date(b[i][0]).getTime()
//     if (time >= minA) {
//       pos = i
//       break
//     }
//   }
//   return b.slice(0, pos).concat(a)
// }

// const mergeData = (local, origin) => {
//   if (local && local.result) {
//     const localResult = local.result
//     const localUid = local.uid
//     const originUid = origin.uid
//     if (localUid !== originUid) return origin.result
//     const originResult = new Map()
//     for (let [key, value] of origin.result) {
//       const newVal = mergeList(value, localResult.get(key))
//       originResult.set(key, newVal)
//     }
//   }
//   return origin.result
// }

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

// const getGachaLog = async (key, page, name, retryCount = 5) => {
//   try {
//     const res = await request(`${gachaLogUrl}&gacha_type=${key}&page=${page}&size=${20}`)
//     return res.data.list
//   } catch (e) {
//     if (retryCount) {
//       sendMsg(`获取${name}第${page}页失败，5秒后进行第${6 - retryCount}次重试……`)
//       await sleep(5)
//       retryCount--
//       return await getGachaLog(key, page, name, retryCount)
//     } else {
//       sendMsg(`获取${name}第${page}页失败，已超出重试次数`)
//       throw e
//     }
//   }
// }

// const getGachaLogs = async (name, key) => {
//   let page = 1
//   let data = []
//   let res = []
//   do {
//     if (page % 10 === 0) {
//       sendMsg(`正在获取${name}第${page}页，每10页休息1秒……`)
//       await sleep(1)
//     }
//     sendMsg(`正在获取${name}第${page}页`)
//     res = await getGachaLog(key, page, name)
//     if (!uid && res.length) {
//       uid = res[0].uid
//       config.urls.set(uid, gachaLogUrl)
//       config.save()
//     }
//     data.push(...res)
//     page += 1
//   } while (res.length > 0)
//   return data
// }

const getGachaType = async (queryString) => {
  const gachaTypeUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
  sendMsg('正在获取抽卡活动类型')
  const res = await request(gachaTypeUrl)
  if (res.retcode !== 0) {
    if (res.message === 'authkey timeout') {
      sendMsg('身份认证已过期，请重新打开游戏抽卡记录')
    } else {
      sendMsg(res.message)
    }
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
  return orderedGachaTypes
}

const getQuerystring = (url) => {
  const { searchParams } = new URL(url)
  if (!searchParams.get('authkey')) {
    return false
  }
  return searchParams
}

// const getUrlFromConfig = () => {
//   if (config.urls.size) {
//     if (localData && localData.uid && config.urls.has(uid)) {
//       const url = config.urls.get(uid)
//       return getQuerystring(url)
//     }
//   }
// }

// const getUrlFromLog = async () => {
//   const url = await readLog()
//   return getQuerystring(url)
// }


// const getData = async () => {
//   const result = new Map()
//   const typeMap = new Map()

//   gachaTypesUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
//   gachaLogUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?${queryString}`

//   for (const type of orderedGachaTypes) {
//     const logs = (await getGachaLogs(type.name, type.key)).map((item) => {
//       return [item.time, item.name, item.item_type, parseInt(item.rank_type)]
//     })
//     logs.reverse()
//     typeMap.set(type.key, type.name)
//     result.set(type.key, logs)
//   }
//   const data = { result, time: Date.now(), typeMap, uid, lang }
//   await readData()
//   const mergedResult = mergeData(localData, data)
//   data.result = mergedResult
//   await saveData(data)
//   return data
// }

const dataMap = new Map()

const proxyServer = (port) => {
  return new Promise((rev) => {
    mitmproxy.createProxy({
      sslConnectInterceptor: (req, cltSocket, head) => {
        if (req.url.includes('hk4e-api.mihoyo.com')) {
          return true
        }
      },
      requestInterceptor: (rOptions, req, res, ssl, next) => {
        next()
        rev(`${rOptions.protocol}//${rOptions.hostname}${rOptions.path}`)
      },
      responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
        next()
      },
      port
    })
  })
}



const useProxy = async () => {
  const ip = localIp()
  const port = config.proxyPort

  sendMsg('正在使用代理模式(${ip}:${port})获取URL，请打开游戏抽卡记录并点击抽卡记录下一页')

  await enableProxy('127.0.0.1', port)
  const url = await proxyServer(port)
  await disableProxy()
  return url
}

const getUrlFromConfig = () => {
  if (config.urls.size) {
    if (localData && localData.uid && config.urls.has(uid)) {
      const url = config.urls.get(uid)
      return url
    }
  }
}

const tryRequest = async (url) => {
  const queryString = getQuerystring(url)
  if (!queryString) return false
  const gachaTypeUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
  const res = await request(gachaTypeUrl)
  if (res.retcode !== 0) {
    return false
  }
  return true
}

const getUrl = async () => {
  let url = getUrlFromConfig()
  if (!url) {
    url = await readLog()
  } else {
    const result = await tryRequest()
    if (!result) {
      return url
    }
  }
  if (!url) {
    url = await useProxy()
  } else {
    const gachaType = await tryGetGachaType()
    if (!gachaType) {
      url = await useProxy()
    }
  }
  return url
}


const fetchData = async () => {
  const url = await getUrl()

}

let localDataReaded = false
const readdir = util.promisify(fs.readdir)
const readData = async () => {
  if (localDataReaded) return
  localDataReaded = true
  await fs.ensureDir(userDataPath)
  const files = await readdir(userDataPath)
  for (let name of files) {
    if (/^gacha-list-\d+\.json$/.test(name)) {
      try {
        const data = await readJSON(name)
        data.typeMap = new Map(data.typeMap)
        data.result = new Map(data.result)
        if (data.uid) {
          dataMap.set(data.uid, data)
        }
      } catch (e) {
        sendMsg(e, 'ERROR')
      }
    }
  }
}

// readData()

// ipcMain.handle('FETCH_DATA', async () => {
//   try {
//     const data = await getData()
//     return data
//   } catch (e) {
//     sendMsg(e, 'ERROR')
//     console.error(e)
//   }
//   return false
// })

ipcMain.handle('READ_DATA', async () => {
  await readData()
  return {
    dataMap,
    current: config.current
  }
})

// exports.readData = readData

