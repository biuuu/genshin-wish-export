const fs = require('fs-extra')
const util = require('util')
const path = require('path')
const { URL } = require('url')
const { app, ipcMain, shell } = require('electron')
const { sleep, request, sendMsg, readJSON, saveJSON, userDataPath, userPath, localIp, langMap } = require('./utils')
const config = require('./config')
const i18n = require('./i18n')
const { enableProxy, disableProxy } = require('./module/system-proxy')
const mitmproxy = require('./module/node-mitmproxy')

const dataMap = new Map()
const order = ['301', '302', '200', '100']
let apiDomain = 'https://api-takumi.mihoyo.com'

const saveData = async (data, url) => {
  const obj = Object.assign({}, data)
  obj.result = [...obj.result]
  obj.typeMap = [...obj.typeMap]
  config.urls.set(data.uid, url)
  await config.save()
  await saveJSON(`gacha-list-${data.uid}.json`, obj)
}

const defaultTypeMap = new Map([
  ['11', '角色活动跃迁'],
  ['12', '光锥活动跃迁'],
  ['1', '群星跃迁'],
  ['2', '始发跃迁']
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
  if ((!config.current && dataMap.size) || (config.current && dataMap.size && !dataMap.has(config.current))) {
    await changeCurrent(dataMap.keys().next().value)
  }
}

const changeCurrent = async (uid) => {
  config.current = uid
  await config.save()
}

const compareList = (b, a) => {
  if (!b.length) return false
  if (b.length < a.length) {
    a = a.slice(0, b.length)
  }
  const strA = a.map(item => item.slice(0, 4).join('-')).join(',')
  const strB = b.map(item => item.slice(0, 4).join('-')).join(',')
  return strA === strB
}

const mergeList = (a, b) => {
  if (!a || !a.length) return b || []
  if (!b || !b.length) return a
  const minA = new Date(a[0][0]).getTime()
  const idA = a[0][5]
  let pos = b.length
  let idFounded = false
  for (let i = b.length - 1; i >= 0; i--) {
    let idB = b[i][5]
    if (idB && idB === idA) {
      pos = i
      idFounded = true
      break
    }
  }
  if (!idFounded) {
    let width = Math.min(11, a.length, b.length)
    for (let i = 0; i < b.length; i++) {
      const time = new Date(b[i][0]).getTime()
      if (time >= minA) {
        if (compareList(b.slice(i, width + i), a.slice(0, width))) {
          pos = i
          break
        }
      }
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
    return originResult
  }
  return origin.result
}

const detectGameLocale = async (userPath) => {
  let list = []
  const lang = app.getLocale()
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', '崩坏：星穹铁道/output_log.txt'), fs.constants.F_OK)
    list.push('崩坏：星穹铁道')
  } catch (e) {}
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', 'Star Rail/output_log.txt'), fs.constants.F_OK)
    list.push('Star Rail')
  } catch (e) {}
  if (config.logType) {
    if (config.logType === 2) {
      list.reverse()
    }
    list = list.slice(0, 1)
  } else if (lang !== 'zh-CN') {
    list.reverse()
  }
  return list
}

let cacheFolder = null
const readLog = async () => {
  const text = i18n.log
  try {
    let userPath
    if (!process.env.WINEPREFIX) {
      userPath = app.getPath('home')
    } else {
      userPath = path.join(process.env.WINEPREFIX, 'drive_c/users', process.env.USER)
    }
    const gameNames = await detectGameLocale(userPath)
    if (!gameNames.length) {
      sendMsg(text.file.notFound)
      return false
    }
    const promises = gameNames.map(async name => {
      const logText = await fs.readFile(`${userPath}/AppData/LocalLow/miHoYo/${name}/Player-prev.log`, 'utf8')
      const gamePathMch = logText.match(/\w:\/.+(StarRail_Data|StarRail_Data)/)
      if (gamePathMch) {
        const cacheText = await fs.readFile(path.join(gamePathMch[0], '/webCaches/Cache/Cache_Data/data_2'), 'utf8')
        const urlMch = cacheText.match(/https.+?auth_appid=webview_gacha.+?authkey=.+?end_id=\w+/g)
        if (urlMch) {
          cacheFolder = path.join(gamePathMch[0], '/webCaches/Cache/')
          return urlMch[urlMch.length - 1]
        }
      }
    })
    const result = await Promise.all(promises)
    for (let url of result) {
      if (url) {
        return url
      }
    }
    sendMsg(text.url.notFound)
    return false
  } catch (e) {
    sendMsg(text.file.readFailed)
    return false
  }
}

const getGachaLog = async ({ key, page, name, retryCount, url, endId }) => {
  const text = i18n.log
  try {
    const res = await request(`${url}&gacha_type=${key}&page=${page}&size=${20}${endId ? '&end_id=' + endId : ''}`)
    return res.data.list
  } catch (e) {
    if (retryCount) {
      sendMsg(i18n.parse(text.fetch.retry, { name, page, count: 6 - retryCount }))
      await sleep(5)
      retryCount--
      return await getGachaLog({ key, page, name, retryCount, url, endId })
    } else {
      sendMsg(i18n.parse(text.fetch.retryFailed, { name, page }))
      throw e
    }
  }
}

const getGachaLogs = async ({ name, key }, queryString) => {
  const text = i18n.log
  let page = 1
  let list = []
  let res = []
  let uid = 0
  let endId = 0
  const url = `${apiDomain}/common/gacha_record/api/getGachaLog?${queryString}`
  do {
    if (page % 10 === 0) {
      sendMsg(i18n.parse(text.fetch.interval, { name, page }))
      await sleep(1)
    }
    sendMsg(i18n.parse(text.fetch.current, { name, page }))
    res = await getGachaLog({ key, page, name, url, endId, retryCount: 5 })
    await sleep(0.3)
    if (!uid && res.length) {
      uid = res[0].uid
    }
    list.push(...res)
    page += 1

    if (res.length) {
      endId = BigInt(res[res.length - 1].id)
    }

    if (!config.fetchFullHistory && res.length && uid && dataMap.has(uid)) {
      const result = dataMap.get(uid).result
      if (result.has(key)) {
        const arr = result.get(key)
        if (arr.length) {
          const localLatestId = arr[arr.length - 1][5]
          if (localLatestId) {
            let shouldBreak = false
            res.forEach(item => {
              if (item.id === localLatestId) {
                shouldBreak = true
              }
            })
            if (shouldBreak) {
              break
            }
          }
        }
      }
    }
  } while (res.length > 0)
  return { list, uid }
}

const checkResStatus = (res) => {
  const text = i18n.log
  if (res.retcode !== 0) {
    let message = res.message
    if (res.message === 'authkey timeout') {
      message = text.fetch.authTimeout
      sendMsg(true, 'AUTHKEY_TIMEOUT')
    }
    sendMsg(message)
    throw new Error(message)
  }
  sendMsg(false, 'AUTHKEY_TIMEOUT')
  return res
}

const tryGetUid = async (queryString) => {
  const url = `${apiDomain}/common/gacha_record/api/getGachaLog?${queryString}`
  try {
    for (let [key] of defaultTypeMap) {
      const res = await request(`${url}&gacha_type=${key}&page=1&size=6`)
      checkResStatus(res)
      if (res.data.list && res.data.list.length) {
        return res.data.list[0].uid
      }
    }
  } catch (e) {}
  return config.current
}

const getGachaType = async (queryString) => {
  const text = i18n.log
  const gachaTypeUrl = `${apiDomain}/event/gacha_info/api/getConfigList?${queryString}`
  sendMsg(text.fetch.gachaType)
  const res = await request(gachaTypeUrl)
  checkResStatus(res)
  const gachaTypes = res.data.gacha_type_list
  const orderedGachaTypes = []
  order.forEach(key => {
    const index = gachaTypes.findIndex(item => item.key === key)
    if (index !== -1)  {
      orderedGachaTypes.push(gachaTypes.splice(index, 1)[0])
    }
  })
  orderedGachaTypes.push(...gachaTypes)
  sendMsg(text.fetch.gachaTypeOk)
  return orderedGachaTypes
}

const fixAuthkey = (url) => {
  const mr = url.match(/authkey=([^&]+)/)
  if (mr && mr[1] && mr[1].includes('=') && !mr[1].includes('%')) {
    return url.replace(/authkey=([^&]+)/, `authkey=${encodeURIComponent(mr[1])}`)
  }
  return url
}

const getQuerystring = (url) => {
  const text = i18n.log
  const { searchParams, host } = new URL(fixAuthkey(url))
  if (host.includes('webstatic-sea') || host.includes('hkrpg-api-os')) {
    // 国际服地址参照了 https://github.com/Scighost/StarRailTool/blob/main/StarRailTool/Gacha/GachaLogClient.cs#LL22
    apiDomain = 'https://api-os-takumi.mihoyo.com'
  } else {
    apiDomain = 'https://api-takumi.mihoyo.com'
  }
  const authkey = searchParams.get('authkey')
  if (!authkey) {
    sendMsg(text.url.lackAuth)
    return false
  }
  searchParams.delete('page')
  searchParams.delete('size')
  searchParams.delete('gacha_type')
  searchParams.delete('end_id')
  return searchParams
}

const proxyServer = (port) => {
  return new Promise((rev) => {
    mitmproxy.createProxy({
      sslConnectInterceptor: (req, cltSocket, head) => {
        if (/webstatic([^\.]{2,10})?\.(mihoyo|hoyoverse)\.com/.test(req.url)) {
          return true
        }
      },
      requestInterceptor: (rOptions, req, res, ssl, next) => {
        next()
        if (/webstatic([^\.]{2,10})?\.(mihoyo|hoyoverse)\.com/.test(rOptions.hostname)) {
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

let proxyServerPromise
const useProxy = async () => {
  const text = i18n.log
  const ip = localIp()
  const port = config.proxyPort
  sendMsg(i18n.parse(text.proxy.hint, { ip, port }))
  await enableProxy('127.0.0.1', port)
  if (!proxyServerPromise) {
    proxyServerPromise = proxyServer(port)
  }
  const url = await proxyServerPromise
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
  const gachaTypeUrl = `${apiDomain}/event/gacha_info/api/getConfigList?${queryString}`
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
    // const result = await tryRequest(url)
    // if (!result) {
    //   url = await readLog()
    // }
  }
  if (!url && config.proxyMode) {
    url = await useProxy()
  } else if (url) {
    // const result = await tryRequest(url)
    // if (!result && config.proxyMode) {
    //   url = await useProxy()
    // }
  }
  return url
}

const fetchData = async (urlOverride) => {
  const text = i18n.log
  await readData()
  let url = urlOverride
  if (!url) {
    url = await getUrl()
  }
  if (!url) {
    const message = text.url.notFound2
    sendMsg(message)
    throw new Error(message)
  }
  const searchParams = getQuerystring(url)
  if (!searchParams) {
    const message = text.url.incorrect
    sendMsg(message)
    throw new Error(message)
  }
  let queryString = searchParams.toString()
  const vUid = await tryGetUid(queryString)
  const localLang = dataMap.has(vUid) ? dataMap.get(vUid).lang : ''
  if (localLang) {
    searchParams.set('lang', localLang)
  }
  queryString = searchParams.toString()
  // 获取抽卡类型，但这个api不知道在哪里，因此注释掉了
  // const gachaType = await getGachaType(queryString)

  const result = new Map()
  const typeMap = new Map()
  const lang = searchParams.get('lang')
  let originUid = 0
  for (const type of defaultTypeMap) {
    const { list, uid } = await getGachaLogs({'name':type[1], 'key':type[0]}, queryString)
    const logs = list.map((item) => {
      return [item.time, item.name, item.item_type, parseInt(item.rank_type), item.gacha_type, item.id]
    })
    logs.reverse()
    typeMap.set(type[0], type[1])
    result.set(type[0], logs)
    if (!originUid) {
      originUid = uid
    }
  }
  const data = { result, time: Date.now(), typeMap, uid: originUid, lang }
  const localData = dataMap.get(originUid)
  const mergedResult = mergeData(localData, data)
  data.result = mergedResult
  dataMap.set(originUid, data)
  await changeCurrent(originUid)
  await saveData(data, url)
}

let proxyStarted = false
const fetchDataByProxy = async () => {
  if (proxyStarted) return
  proxyStarted = true
  const url = await useProxy()
  await fetchData(url)
}

ipcMain.handle('FETCH_DATA', async (event, param) => {
  try {
    if (param === 'proxy') {
      await fetchDataByProxy()
    } else {
      await fetchData(param)
    }
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

ipcMain.handle('CHANGE_UID', (event, uid) => {
  config.current = uid
})

ipcMain.handle('GET_CONFIG', () => {
  return config.value()
})

ipcMain.handle('LANG_MAP', () => {
  return langMap
})

ipcMain.handle('SAVE_CONFIG', (event, [key, value]) => {
  config[key] = value
  config.save()
})

ipcMain.handle('DISABLE_PROXY', async () => {
  await disableProxy()
})

ipcMain.handle('I18N_DATA', () => {
  return i18n.data
})

ipcMain.handle('OPEN_CACHE_FOLDER', () => {
  if (cacheFolder) {
    shell.openPath(cacheFolder)
  }
})

exports.getData = () => {
  return {
    dataMap,
    current: config.current
  }
}
