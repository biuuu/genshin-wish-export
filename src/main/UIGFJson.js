const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const getData = require('./getData').getData
const { version } = require('../../package.json')

const getTimeString = () => {
  return new Date().toLocaleString('zh-cn', { hour12: false }).replace(/[/\s:]/g, '').slice(0, -2)
}

const formatDate = (date) => {
  let y = date.getFullYear();
  let m = `${date.getMonth()+1}`.padStart(2, "0");
  let d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${date.toLocaleString( 'zh-cn', { hour12: false }).slice(-8)}`
}

const start = async () => {
  const { dataMap, current } = await getData()
  const data = dataMap.get(current)
  if (!data.result.size) {
    throw new Error('数据为空')
  }
  const result = {
    info: {
      uid: data.uid,
      lang: data.lang,
      export_time: formatDate(new Date()),
      export_app: 'genshin-wish-export',
      export_app_version: version,
      uigf_version: '2.1'
    },
    list: []
  }
  for (let [type, arr] of data.result) {
    arr.forEach(item => {
      result.list.push({
        gacha_type: item[4] || type,
        time: item[0],
        name: item[1],
        item_type: item[2],
        rank_type: `${item[3]}`,
        id: item[5] || '',
        uigf_gacha_type: type
      })
    })
  }
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), `UIGF_${data.uid}_${getTimeString()}`),
    filters: [
      { name: 'JSON文件', extensions: ['json'] }
    ]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, JSON.stringify(result))
  }
}

ipcMain.handle('EXPORT_UIGF_JSON', async () => {
  await start()
})
