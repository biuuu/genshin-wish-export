const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const { getData, saveData, changeCurrent } = require('./getData')
const getItemTypeNameMap = require('./gachaTypeMap').getItemTypeNameMap
const { version } = require('../../package.json')
const config = require('./config')
const fetch = require('electron-fetch').default
const { readJSON, saveJSON, existsFile, userDataPath, fixLocalMap, md5, mapToObject } = require('./utils')
const Ajv = require('ajv')
const Ajv2020 = require('ajv/dist/2020')

// acquire uigf schema
const validateUigf30Json = new Ajv({ strict: false }).compile(require('../schema/uigf3_0.json'))
const validateUigf41Json = new Ajv2020({ strict: false }).compile(require('../schema/uigf4_1.json'))
const validateLocalJson = new Ajv({ strict: false }).compile(require('../schema/local-data.json'))

const uigfLangMap = new Map([
  ['zh-cn', 'chs'],
  ['zh-tw', 'cht'],
  ['de-de', 'de'],
  ['en-us', 'en'],
  ['es-es', 'es'],
  ['fr-fr', 'fr'],
  ['id-id', 'id'],
  ['ja-jp', 'jp'],
  ['ko-kr', 'kr'],
  ['pt-pt', 'pt'],
  ['ru-ru', 'ru'],
  ['th-th', 'th'],
  ['vi-vn', 'vi']
])
const uigfRevLangMap = new Map(Array.from(uigfLangMap, ([key, value]) => [value, key]))

const getTimeString = () => {
  return new Date().toLocaleString('sv').replace(/[- :]/g, '').slice(0, -2)
}

const formatDate = (date) => {
  let y = date.getFullYear()
  let m = `${date.getMonth()+1}`.padStart(2, '0')
  let d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${date.toLocaleString('zh-cn', { hour12: false }).slice(-8)}`
}

const fakeIdFn = () => {
  let id = 1000000000000000000n
  return () => {
    id = id + 1n
    return id.toString()
  }
}

const shouldBeString = (value) => {
  if (typeof value !== 'string') {
    return ''
  }
  return value
}

// a dictionary for looking up item ids
const itemIdDict = new Map()
// the md5 value for the dictionary
const itemIdDictMd5 = new Map()
// the file name for saving item id dictionary
const itemIdDictFileName = 'item-id-dict.json'

// acquire dictionary based on give language
const fetchItemIdDict = async () => {
  // fetch item id dicts from api.uigf.org
  let response = await fetch(`https://api.uigf.org/dict/genshin/all.json`)
  let responseJson = await response.json()
  if (response.status === 200) { // successfully fetched all.json
    Object.entries(responseJson).forEach(([lang, dict]) => {
      itemIdDict.set(lang, new Map(Object.entries(dict).map(([name, id]) => [name, String(id)])))
    })
  } else { // all.json failed, attempting to fetch individual languages
    console.error(`All dict fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
    for (const [_, lang] of uigfLangMap) {
      response = await fetch(`https://api.uigf.org/dict/genshin/${lang}.json`)
      const responseText = await response.text().catch((e) => console.error(e))
      responseJson = JSON.parse(responseText)
      if (response.status !== 200) {
        console.error(`${lang} dict fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
        continue
      }
      itemIdDict.set(lang, new Map(Object.entries(responseJson).map(([name, id]) => [name, String(id)])))
      itemIdDictMd5.set(lang, md5(responseText))
    }
  }
}

// acquire dictionary based on give language
const fetchItemIdDictMd5 = async (lang = 'all') => {
  const response = await fetch('https://api.uigf.org/md5/genshin')
  const responseJson = await response.json()
  if (response.status !== 200) throw new Error(`MD5 fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
  Object.entries(responseJson).forEach(([lang, hash]) => itemIdDictMd5.set(lang, hash))
}

// initialize item id dictionary
const initLookupTable = async () => {
  // check if itemIdDict has been init, no need to do it again
  if (itemIdDict.size > 0) {
    return
  }

  // fetch the remote MD5 hashes
  await fetchItemIdDictMd5().catch((e) => console.error(e))

  // if a locally cached dictionary does not exist, fetch a new copy
  if (!existsFile(itemIdDictFileName)) {
    await fetchItemIdDict();
    return;
  }

  // load the locally cached dictionary
  const localItemIdDict = await readJSON(itemIdDictFileName)

  // if localItemIdDict is empty or old version, refetch
  if (!localItemIdDict || typeof localItemIdDict.md5 === "string") {
    await fetchItemIdDict()
    return
  }

  // ensure all remote md5 matches local hashes
  for (const [lang, hash] of itemIdDictMd5.entries()) {
    const localHash = localItemIdDict.md5[lang] || ''
    if (localHash !== hash) {
      await fetchItemIdDict()
      return
    }
  }

  // insert locally cached dicts into memory
  for (const [lang, dict] of Object.entries(localItemIdDict.lang)) {
    itemIdDict.set(lang, new Map(Object.entries(dict).map(([name, id]) => [name, String(id)])))
  }
}

// save item id dictionary
const saveLookupTable = async () => {
  await saveJSON(itemIdDictFileName, { lang: mapToObject(itemIdDict), md5: mapToObject(itemIdDictMd5) })
}

// get item id
const getItemId = async (lang, name) => {
  // fetch item id from api.uigf.org if cannot find it from existing item id dictionary
  if (!itemIdDict.has(lang) || !itemIdDict.get(lang).has(name)) {
    const response = await fetch(`https://api.uigf.org/identify/genshin/${name}`)
    const responseJson = await response.json()
    if (response.status != 200) {
      throw new Error(`Couldn't find the item_id for the ${name}.`)
    }
    itemIdDict.get(lang).set(name, responseJson.matched[0].item_id.toString())
  }
  return itemIdDict.get(lang).get(name)
}

// get item id
const fixUigfJson = (importData) => {
  // if item_id is missing, add placeholder item_id to importData
  try {
    if (importData.list) { // v3.0
      importData.list.forEach(item => {
        if (!item.item_id) {
          item.item_id = ""
        }
      })
    } else if (importData.hk4e) { // v4.x
      importData.hk4e.forEach(account => account.list.forEach((item) => {
        if (!item.item_id) {
          item.item_id = ""
        }
      }))
    }
  } catch (e) {
    console.error(`Failed to fix UIGF Json: ${e}`)
  }
}

const generateUigf30Json = async () => {
  const { dataMap, current } = getData()
  const data = dataMap.get(current)
  if (!data?.result.size) {
    throw new Error('数据为空')
  }
  const fakeId = fakeIdFn()
  const result = {
    info: {
      uid: data.uid,
      lang: data.lang,
      export_time: formatDate(new Date()),
      export_timestamp: Math.round(Date.now() / 1000),
      export_app: 'genshin-wish-export',
      export_app_version: `v${version}`,
      uigf_version: 'v3.0',
      region_time_zone: data.uid.startsWith('6') ? -5 : data.uid.startsWith('7') ? 1 : 8
    },
    list: []
  }
  const listTemp = []
  const uigfLang = uigfLangMap.get(data.lang) || uigfLangMap.get(fixLocalMap.get(data.lang))
  for (let [type, arr] of data.result) {
    for (let item of arr) {
      listTemp.push({
        gacha_type: shouldBeString(item[4]) || type,
        time: item[0],
        timestamp: new Date(item[0]).getTime(),
        name: item[1],
        item_type: item[2],
        item_id: await getItemId(uigfLang, item[1]),
        rank_type: `${item[3]}`,
        id: shouldBeString(item[5]) || '',
        uigf_gacha_type: type
      })
    }
  }
  listTemp.sort((a, b) => a.timestamp - b.timestamp)
  listTemp.forEach(item => {
    delete item.timestamp
    result.list.push({
      ...item,
      id: item.id || fakeId()
    })
  })
  return result
}

const generateUigf41Json = async (uigfAllAccounts=true) => {
  const { dataMap, current } = getData()
  if (!Array.from(dataMap.entries()).reduce((accumulate, account) => accumulate + account[1].result.size, 0)) {
    throw new Error('数据为空')
  }
  const result = {
    info: {
      export_timestamp: Math.round(Date.now() / 1000),
      export_app: `genshin-wish-export`,
      export_app_version: `v${version}`,
      version: "v4.1"
    },
    hk4e: []
  }
  for (const [uid, data] of dataMap) {
    if (!uigfAllAccounts && uid != current) continue
    const uidMatch = uid.match(/^(?<prefix>\d{1,2})\d{8}$/) // match 1 or 2 digits followed by exactly 8 digits
    const uidPrefix = uidMatch.groups.prefix
    const uigfLang = uigfLangMap.get(data.lang) || uigfLangMap.get(fixLocalMap.get(data.lang))
    const fakeId = fakeIdFn()
    const account = {
      uid: uid,
      timezone: ['6'].includes(uidPrefix) ? -5 : ['7'].includes(uidPrefix) ? 1 : 8, // 6(America): TZ=-5, 7(Europe): TZ=1, All others TZ=8
      lang: uigfRevLangMap.get(data.lang) || data.lang, // ensure long-format for lang
      list: []
    }
    for (const [gachaType, gachaList] of data.result) {
      for (const gacha of gachaList){
        const gachaItem = {
          uigf_gacha_type: gachaType,
          gacha_type: gachaType,
          item_id: await getItemId(uigfLang, gacha[1]),
          // count: null, // optional and not included in stored data
          time: gacha[0],
          timestamp: new Date(gacha[0]).getTime(), // Used to sort list for in-order fakeIds
          name: gacha[1],
          item_type: gacha[2],
          rank_type: `${gacha[3]}`,
          id: shouldBeString(gacha[5]) || ''
        }
        account.list.push(gachaItem)
      }
    }
    const sortedList = account.list.sort((itemA, itemB) => itemA.timestamp - itemB.timestamp)
    for (const gachaItem of sortedList) {
      delete gachaItem.timestamp
      gachaItem.id = gachaItem.id || fakeId()
    }
    result.hk4e.push(account)
  }
  return result
}

const start = async (uigfVersion, uigfAllAccounts=true) => {
  await initLookupTable()
  const result = uigfVersion === "3.0" ? await generateUigf30Json() : await generateUigf41Json(uigfAllAccounts)
  await saveLookupTable()
  const uid = uigfVersion === '3.0' ? result.info.uid : result.hk4e[0].uid
  const numAccounts = uigfVersion === '3.0' ? 1 : result.hk4e.length
  const uigfFileName = `UIGF_v${uigfVersion}` + (numAccounts > 1 ? '' : `_${uid}`) + `_${getTimeString()}.json`
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), uigfFileName),
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, JSON.stringify(result, null, config.readableJSON ? '\t' : null))
  }
}

const saveAndBackup = async (data) => {
  if (existsFile(`gacha-list-${data.uid}.json`)) {
    const backupDir = path.join(userDataPath, 'backup', data.uid)
    await fs.ensureDir(backupDir)
    await fs.copyFile(path.join(userDataPath, `gacha-list-${data.uid}.json`), path.join(backupDir, `gacha-list-${data.uid}-${getTimeString()}.json`))
  }
  await saveData(data)
  await changeCurrent(data.uid)
}

const importUgif30Json = async (importData) => {
    const gachaData = {
      result: new Map(),
      time: Date.now(),
      typeMap: getItemTypeNameMap(importData.info.lang),
      uid: importData.info.uid,
      lang: importData.info.lang
    }
    gachaData.typeMap.forEach((_, k) => gachaData.result.set(k, []))
    importData.list.sort((a, b) => parseInt(BigInt(a.id) - BigInt(b.id)))
    for (const item of importData.list) {
      gachaData.result.get(item.uigf_gacha_type).push([
        item.time,
        item.name,
        item.item_type,
        parseInt(item.rank_type),
        item.gacha_type,
        item.id 
      ])
    }
    await saveAndBackup(gachaData)
}

const importUgif41Json = async (importData) => {
  for (const accountData of importData.hk4e) {
      const gachaData = {
        result: new Map(),
        time: Date.now(),
        typeMap: getItemTypeNameMap(accountData.lang),
        uid: accountData.uid,
        lang: accountData.lang
      }
      gachaData.typeMap.forEach((_, k) => gachaData.result.set(k, []))
      accountData.list.sort((itemA, itemB) => parseInt(BigInt(itemA.id) - BigInt(itemB.id)))
      for (const item of accountData.list) {
        const gachaItem = [
          item.time,
          item.name,
          item.item_type,
          parseInt(item.rank_type),
          item.gacha_type,
          item.id
        ]
        gachaData.result.get(item.uigf_gacha_type).push(gachaItem)
      }
      await saveAndBackup(gachaData)
  }
}

const importJson = async () => {
  const filePathArr = dialog.showOpenDialogSync({
    defaultPath: app.getPath('downloads'),
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  })
  if (filePathArr) {
    const filePath = filePathArr[0]
    const jsonStr = await fs.readFile(filePath, 'utf8')
    const importData = JSON.parse(jsonStr)
    // if the importData is gacha-list file
    if (validateLocalJson(importData)) {
      await saveAndBackup(importData)
    }
    // else, assume importData is uigf format file
    else {
      // try to fix imported data when possible
      fixUigfJson(importData)
      // then validate imported data using schema
      if (validateUigf30Json(importData)) {
        await importUgif30Json(importData)
      } else if (validateUigf41Json(importData)) {
        await importUgif41Json(importData)
      } else {
        throw new Error(`JSON format error`)
      }
    }
  } else {
    return 'canceled'
  }
}

ipcMain.handle('EXPORT_UIGF_JSON', async (event, uigfVersion, uigfAllAccounts=true) => {
  await start(uigfVersion, uigfAllAccounts)
})

ipcMain.handle('IMPORT_UIGF_JSON', async () => {
  return await importJson()
})

module.exports = { generateUigf30Json, generateUigf41Json }