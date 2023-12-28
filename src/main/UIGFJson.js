const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const getData = require('./getData').getData
const { version } = require('../../package.json')
const config = require('./config')
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

function uigfJson() {
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
    arr.forEach(item => {
      listTemp.push({
        gacha_type: shouldBeString(item[4]) || type,
        time: item[0],
        timestamp: new Date(item[0]).getTime(),
        name: item[1],
        item_type: item[2],
        rank_type: `${item[3]}`,
        id: shouldBeString(item[5]) || '',
        uigf_gacha_type: type
      })
    })
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
  const result = uigfJson()
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