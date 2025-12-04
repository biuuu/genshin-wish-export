const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const { getData, saveData, changeCurrent } = require('./getData')
const getItemTypeNameMap = require('./gachaTypeMap').getItemTypeNameMap
const { version } = require('../../package.json')
const config = require('./config')
const { existsFile, userDataPath, fixLocalMap } = require('./utils')
const { initLookupTable, getItemId, uigfLangMap } = require('./UIGFApi.js')
const Ajv = require('ajv')

// acquire uigf schema
const validateUigfJson = new Ajv().compile(require('../schema/uigf.json'))
const validateLocalJson = new Ajv().compile(require('../schema/local-data.json'))

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

// get item id
const fixUigfJson = (importData) => {
  // if item_id is missing, add placeholder item_id to importData
  importData.list.forEach(e => {
    if (!e.item_id) {
      e.item_id = ""
    }
  })
}

const uigfJson = async () => {
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

const start = async () => {
  await initLookupTable()
  const result = await uigfJson()
  await saveLookupTable()
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), `UIGF_${result.info.uid}_${getTimeString()}`),
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
      if (validateUigfJson(importData)) {
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
          gachaData.result.get(item.uigf_gacha_type).push([item.time, item.name, item.item_type, parseInt(item.rank_type), item.gacha_type, item.id])
        }
        await saveAndBackup(gachaData)
      } else {
        throw new Error(`JSON format error`)
      }
    }
  } else {
    return 'canceled'
  }
}

ipcMain.handle('EXPORT_UIGF_JSON', async () => {
  await start()
})

ipcMain.handle('IMPORT_UIGF_JSON', async () => {
  return await importJson()
})

module.exports = { initLookupTable, uigfJson }