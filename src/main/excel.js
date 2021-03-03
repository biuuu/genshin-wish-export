const ExcelJS = require('./module/exceljs.min.js')
const getData = require('./getData').getData
const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')

function pad(num) {
  return `${num}`.padStart(2, "0");
}

function getTimeString() {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}

const start = async () => {
  const { dataMap, current } = await getData()
  const data = dataMap.get(current)
  // https://github.com/sunfkny/genshin-gacha-export-js/blob/main/index.js
  const workbook = new ExcelJS.Workbook()
  for (let [key, value] of data.result) {
    const name = data.typeMap.get(key)
    const sheet = workbook.addWorksheet(name, {views: [{state: 'frozen', ySplit: 1}]})
    sheet.columns = [
      { header: "时间", key: "time", width: 24 },
      { header: "名称", key: "name", width: 14 },
      { header: "类别", key: "type", width: 8 },
      { header: "星级", key: "rank", width: 8 },
      { header: "总次数", key: "idx", width: 8 },
      { header: "保底内", key: "pdx", width: 8 },
    ]
    // get gacha logs
    const logs = value
    let idx = 0
    let pdx = 0
    for (let log of logs){
      idx += 1
      pdx += 1
      log.push(idx,pdx)
      if (log[3] === 5) {
        pdx = 0
      }
    }

    sheet.addRows(logs)
    // set xlsx hearer style
    ;(["A", "B", "C", "D","E","F"]).forEach((v) => {
      sheet.getCell(`${v}1`).border = {
        top: {style:'thin', color: {argb:'ffc4c2bf'}},
        left: {style:'thin', color: {argb:'ffc4c2bf'}},
        bottom: {style:'thin', color: {argb:'ffc4c2bf'}},
        right: {style:'thin', color: {argb:'ffc4c2bf'}}
      }
      sheet.getCell(`${v}1`).fill = {
        type: 'pattern',
        pattern:'solid',
        fgColor:{argb:'ffdbd7d3'},
      }
      sheet.getCell(`${v}1`).font ={
        name: '微软雅黑',
        color: { argb: "ff757575" },
        bold : true
      }

    })
    // set xlsx cell style
    logs.forEach((v, i) => {
      ;(["A", "B", "C", "D","E","F"]).forEach((c) => {
        sheet.getCell(`${c}${i + 2}`).border = {
          top: {style:'thin', color: {argb:'ffc4c2bf'}},
          left: {style:'thin', color: {argb:'ffc4c2bf'}},
          bottom: {style:'thin', color: {argb:'ffc4c2bf'}},
          right: {style:'thin', color: {argb:'ffc4c2bf'}}
        }
        sheet.getCell(`${c}${i + 2}`).fill = {
          type: 'pattern',
          pattern:'solid',
          fgColor:{argb:'ffebebeb'},
        }
        // rare rank background color
        const rankColor = {
          3: "ff8e8e8e",
          4: "ffa256e1",
          5: "ffbd6932",
        }
        sheet.getCell(`${c}${i + 2}`).font = {
          name: '微软雅黑',
          color: { argb: rankColor[v[3]] },
          bold : v[3]!="3"
        }
      })
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), `原神抽卡记录_${getTimeString()}`),
    filters: [
      { name: 'Excel文件', extensions: ['xlsx'] }
    ]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, buffer)
  }
}

ipcMain.handle('SAVE_EXCEL', async () => {
  await start()
})