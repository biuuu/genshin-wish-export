const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const getData = require('./getData').getData
const { version } = require('../../package.json')
const config = require('./config')
const fetch = require('electron-fetch').default;
const moment = require('moment')

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

// a lookup table for storing item ids
const itemIdLookupTable = new Map()

// get item id
const getItemId = async(name) => {
  // fetch item id from api.uigf.org if cannot find it from lookup table
  if (!itemIdLookupTable.has(name)){
    const response = await fetch(`https://api.uigf.org/identify/genshin/${name}`)
    const responseJson = await response.json()
    itemIdLookupTable.set(name, responseJson.item_id.toString())
  }
  return itemIdLookupTable.get(name)
}

const uigfJson = async() => {
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
      uigf_version: 'v2.4',
      region_time_zone: 8
    },
    list: []
  }
  const listTemp = []
  for (let [type, arr] of data.result) {
    for (let item of arr) {
      listTemp.push({
        gacha_type: shouldBeString(item[4]) || type,
        time: item[0],
        timestamp: new Date(item[0]).getTime(),
        name: item[1],
        item_type: item[2],
        item_id: await getItemId(item[1]),
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
  // obtain region_time_zone according to the latest time obtained (new in uigf 2.4)
  result.info.region_time_zone = moment(result.list[0].time).utcOffset() / 60
  return result
}

const start = async () => {
  const result = await uigfJson()
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), `UIGF_${result.info.uid}_${getTimeString()}`),
    filters: [
      { name: 'JSON文件', extensions: ['json'] }
    ]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, JSON.stringify(result, null, config.readableJSON ? "\t" : null))
  }
}

ipcMain.handle('EXPORT_UIGF_JSON', async () => {
  await start()
})

module.exports = { uigfJson }