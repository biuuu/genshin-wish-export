const fs = require('fs-extra')
const path = require('path')
const { URL } = require('url')
const { app, ipcMain, shell, clipboard } = require('electron')
const { readdir, sleep, request, sendMsg, readJSON, saveJSON, userDataPath, userPath, localIp, langMap, getCacheText } = require('./utils')
const config = require('./config')
const getItemTypeNameMap = require('./gachaTypeMap').getItemTypeNameMap
const i18n = require('./i18n')
const { enableProxy, disableProxy } = require('./module/system-proxy')
const mitmproxy = require('./module/node-mitmproxy')

const dataMap = new Map()
let apiDomain = 'https://public-operation-hk4e.mihoyo.com'

const saveData = async (data, url) => {
  const obj = Object.assign({}, data)
  obj.result = [...obj.result]
  obj.typeMap = [...obj.typeMap]
  if (url) {
    config.urls.set(data.uid, url)
    await config.save()
  }
  await saveJSON(`gacha-list-${data.uid}.json`, obj)
}

const defaultTypeMap = new Map([
  ['301', '角色活动祈愿'],
  ['302', '武器活动祈愿'],
  ['500', '集录祈愿'],
  ['200', '常驻祈愿'],
  ['100', '新手祈愿']
])

let localDataReaded = false
const readData = async (force = false) => {
  if (localDataReaded && !force) return
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

const detectGameType = async (userPath) => {
  let list = []
  const lang = app.getLocale()
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', '原神/output_log.txt'), fs.constants.F_OK)
    list.push('原神')
  } catch (e) {}
  try {
    await fs.access(path.join(userPath, '/AppData/LocalLow/miHoYo/', 'Genshin Impact/output_log.txt'), fs.constants.F_OK)
    list.push('Genshin Impact')
  } catch (e) {}
  if (config.logType) {
    if (config.logType === 2) {
      list.reverse()
    } else if (config.logType === 3) {
      list = []
    }
    list = list.slice(0, 1)
  } else if (lang !== 'zh-CN') {
    list.reverse()
  }
  try {
    await fs.access(path.join(userPath, '/AppData/Local/', 'miHoYo/GenshinImpactCloudGame/config/logs/MiHoYoSDK.log'), fs.constants.F_OK)
    list.push('cloud')
  } catch (e) {}
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
    const gameNames = await detectGameType(userPath)
    if (!gameNames.length) {
      sendMsg(text.file.notFound)
      return false
    }
    const promises = gameNames.map(async name => {
      if (name === 'cloud') {
        const cacheText = await fs.readFile(path.join(userPath, '/AppData/Local/', 'miHoYo/GenshinImpactCloudGame/config/logs/MiHoYoSDK.log'), 'utf8')
        const urlMch = cacheText.match(/https.+?auth_appid=webview_gacha.+?authkey=.+?game_biz=hk4e_\w+/g)
        if (urlMch) {
          return urlMch[urlMch.length - 1]
        }
      } else {
        const logText = await fs.readFile(`${userPath}/AppData/LocalLow/miHoYo/${name}/output_log.txt`, 'utf8')
        const gamePathMch = logText.match(/\w:\/.+(GenshinImpact_Data|YuanShen_Data)/)
        if (gamePathMch) {
          const [cacheText, cacheFile] = await getCacheText(gamePathMch[0])
          const urlMch = cacheText.match(/https.+?auth_appid=webview_gacha.+?authkey=.+?game_biz=hk4e_\w+/g)
          if (urlMch) {
            cacheFolder = cacheFile.replace(/Cache_Data[/\\]data_2$/, '')
            return urlMch[urlMch.length - 1]
          }
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

const getGachaLogs = async ([key, name], queryString) => {
  const text = i18n.log
  let page = 1
  let list = []
  let res = []
  let uid = 0
  let endId = 0
  const url = `${apiDomain}/gacha_info/api/getGachaLog?${queryString}`
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
  const url = `${apiDomain}/gacha_info/api/getGachaLog?${queryString}`
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
  if (host.includes('webstatic-sea') || host.includes('hk4e-api-os') || host.includes('hoyoverse.com')) {
    apiDomain = 'https://public-operation-hk4e-sg.hoyoverse.com'
  } else {
    apiDomain = 'https://public-operation-hk4e.mihoyo.com'
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

const tryRequest = async (url, retry = false) => {
  const queryString = getQuerystring(url)
  if (!queryString) return false
  const gachaTypeUrl = `${apiDomain}/gacha_info/api/getConfigList?${queryString}`
  const res = await request(gachaTypeUrl)
  checkResStatus(res)
}

const getUrl = async () => {
  let url = await readLog()
  await tryRequest(url)
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
  let localLang = dataMap.has(vUid) ? dataMap.get(vUid).lang : ''
  if (localLang) {
    if (!localLang.startsWith('zh-')) {
      localLang = localLang.replace(/-\w+$/, '')
    }
    searchParams.set('lang', localLang)
  }
  queryString = searchParams.toString()
  const result = new Map()
  const typeMap = new Map()
  const lang = searchParams.get('lang')
  console.log(lang)
  const gachaType = getItemTypeNameMap(lang)
  let originUid = 0
  for (const type of gachaType) {
    const { list, uid } = await getGachaLogs(type, queryString)
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

ipcMain.handle('FORCE_READ_DATA', async () => {
  await readData(true)
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

ipcMain.handle('COPY_URL', async () => {
  const url = await getUrl()
  if (url) {
    clipboard.writeText(url)
    return true
  }
  return false
})

exports.getData = () => {
  return {
    dataMap,
    current: config.current
  }
}

exports.saveData = saveData

exports.changeCurrent = changeCurrent