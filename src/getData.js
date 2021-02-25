const fs = require('fs-extra')
const util = require('util')
const path = require('path')
const { URL } = require('url')
const { app, ipcMain } = require('electron')
const { sleep, request, detectGameLocale, sendMsg, readJSON, saveJSON, userDataPath, userPath, localIp } = require('./utils')
const config = require('./config')
const { enableProxy, disableProxy } = require('./module/system-proxy')
const mitmproxy = require('./module/node-mitmproxy')

const dataMap = new Map()
const order = ['301', '302', '200', '100']

const saveData = async (data, url) => {
  const obj = Object.assign({}, data)
  obj.result = [...obj.result]
  obj.typeMap = [...obj.typeMap]
  config.urls.set(data.uid, url)
  await config.save()
  await saveJSON(`gacha-list-${data.uid}.json`, obj)
}

const defaultTypeMap = new Map([
  ['301', '角色活动祈愿'],
  ['302', '武器活动祈愿'],
  ['200', '常驻祈愿'],
  ['100', '新手祈愿']
])

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
        data.typeMap = new Map(data.typeMap) || defaultTypeMap
        data.result = new Map(data.result)
        if (data.uid) {
          dataMap.set(data.uid, data)
        }
      } catch (e) {
        sendMsg(e, 'ERROR')
      }
    }
  }
  if (!config.current && dataMap.size) {
    config.current = dataMap.keys().next().value
  }
}

const changeCurrent = async (uid) => {
  config.current = uid
  await config.save()
}

const mergeList = (a, b) => {
  if (!a || !a.length) return b || []
  if (!b || !b.length) return a
  const minA = new Date(a[0][0]).getTime()
  let pos = b.length
  for (let i = 0; i < b.length; i++) {
    const time = new Date(b[i][0]).getTime()
    if (time >= minA) {
      pos = i
      break
    }
  }
  return b.slice(0, pos).concat(a)
}

const mergeData = (local, origin) => {
  if (local && local.result) {
    const localResult = local.result
    const localUid = local.uid
    const originUid = origin.uid
    if (localUid !== originUid) return origin.result
    const originResult = new Map()
    for (let [key, value] of origin.result) {
      const newVal = mergeList(value, localResult.get(key))
      originResult.set(key, newVal)
    }
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

const getGachaLog = async ({ key, page, name, retryCount, url }) => {
  try {
    const res = await request(`${url}&gacha_type=${key}&page=${page}&size=${20}`)
    return res.data.list
  } catch (e) {
    if (retryCount) {
      sendMsg(`获取${name}第${page}页失败，5秒后进行第${6 - retryCount}次重试……`)
      await sleep(5)
      retryCount--
      return await getGachaLog(key, page, name, retryCount, url)
    } else {
      sendMsg(`获取${name}第${page}页失败，已超出重试次数`)
      throw e
    }
  }
}

const getGachaLogs = async ({ name, key }, queryString) => {
  let page = 1
  let list = []
  let res = []
  let uid = 0
  const url = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?${queryString}`
  do {
    if (page % 10 === 0) {
      sendMsg(`正在获取${name}第${page}页，每10页休息1秒……`)
      await sleep(1)
    }
    sendMsg(`正在获取${name}第${page}页`)
    res = await getGachaLog({ key, page, name, url, retryCount: 5 })
    if (!uid && res.length) {
      uid = res[0].uid
    }
    list.push(...res)
    page += 1
  } while (res.length > 0)
  return { list, uid }
}

const tryGetUid = async (queryString) => {
  const url = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog?${queryString}`
  for (let [key] of defaultTypeMap) {
    const res = await request(`${url}&gacha_type=${key}&page=1&size=6`)
    if (res.data.list && res.data.list.length) {
      return res.data.list[0].uid
    }
  }
  return config.current
}

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
    sendMsg('URL中缺少authkey')
    return false
  }
  searchParams.delete('page')
  searchParams.delete('size')
  searchParams.delete('gacha_type')
  return searchParams
}

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
        if (rOptions.hostname.includes('hk4e-api.mihoyo.com')) {
          if (/authkey=[^&]+/.test(rOptions.path)) {
            rev(`${rOptions.protocol}//${rOptions.hostname}${rOptions.path}`)
          }
        }
      },
      responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
        next()
      },
      getPath: () => path.join(userPath, 'node-mitmproxy'),
      port
    })
  })
}

const useProxy = async () => {
  const ip = localIp()
  const port = config.proxyPort
  sendMsg(`正在使用代理模式[${ip}:${port}]获取URL，请打开游戏抽卡记录，或刷新抽卡记录`)
  await enableProxy('127.0.0.1', port)
  const url = await proxyServer(port)
  await disableProxy()
  return url
}

const getUrlFromConfig = () => {
  if (config.urls.size) {
    if (config.current && config.urls.has(config.current)) {
      const url = config.urls.get(config.current)
      return url
    }
  }
}

const tryRequest = async (url, retry = false) => {
  const queryString = getQuerystring(url)
  if (!queryString) return false
  const gachaTypeUrl = `https://hk4e-api.mihoyo.com/event/gacha_info/api/getConfigList?${queryString}`
  try {
    const res = await request(gachaTypeUrl)
    if (res.retcode !== 0) {
      return false
    }
    return true
  } catch (e) {
    if (e.code === 'ERR_PROXY_CONNECTION_FAILED' && !retry) {
      await disableProxy()
      return await tryRequest(url, true)
    }
    sendMsg(e.message.replace(url, '***'), 'ERROR')
    throw e
  }
}

const getUrl = async () => {
  let url = getUrlFromConfig()
  if (!url) {
    url = await readLog()
  } else {
    const result = await tryRequest(url)
    if (!result) {
      url = await readLog()
    }
  }
  if (!url) {
    url = await useProxy()
  } else {
    const result = await tryRequest(url)
    if (!result) {
      url = await useProxy()
    }
  }
  return url
}

const fetchData = async () => {
  await readData()
  const url = await getUrl()
  if (!url) return false
  const searchParams = await getQuerystring(url)
  if (!searchParams) return false
  let queryString = searchParams.toString()
  const vUid = await tryGetUid(queryString)
  const localLang = dataMap.has(vUid) ? dataMap.get(vUid).lang : ''
  if (localLang) {
    searchParams.set('lang', localLang)
  }
  queryString = searchParams.toString()
  const gachaType = await getGachaType(queryString)

  const result = new Map()
  const typeMap = new Map()
  const lang = searchParams.get('lang')
  let originUid = 0
  for (const type of gachaType) {
    const { list, uid } = await getGachaLogs(type, queryString)
    const logs = list.map((item) => {
      return [item.time, item.name, item.item_type, parseInt(item.rank_type)]
    })
    logs.reverse()
    typeMap.set(type.key, type.name)
    result.set(type.key, logs)
    originUid = uid
  }
  const data = { result, time: Date.now(), typeMap, uid: originUid, lang }
  const localData = dataMap.get(originUid)
  const mergedResult = mergeData(localData, data)
  data.result = mergedResult
  dataMap.set(originUid, data)
  await changeCurrent(originUid)
  await saveData(data, url)
}

ipcMain.handle('FETCH_DATA', async () => {
  try {
    await fetchData()
    return {
      dataMap,
      current: config.current
    }
  } catch (e) {
    sendMsg(e, 'ERROR')
    console.error(e)
  }
  return false
})

ipcMain.handle('READ_DATA', async () => {
  await readData()
  return {
    dataMap,
    current: config.current
  }
})

exports.getData = () => {
  return {
    dataMap,
    current: config.current
  }
}

