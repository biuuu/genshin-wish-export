const { app } = require('electron')
const fetch = require('electron-fetch').default
const semver = require('semver')
const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const ofs = require('original-fs')
const extract = require('../module/extract-zip')
const { version } = require('../../package.json')
const { hash, sendMsg } = require('../utils')
const streamPipeline = util.promisify(require('stream').pipeline)

async function download(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
  await streamPipeline(response.body, ofs.createWriteStream(filePath))
}

const isDev = !app.isPackaged
const updatePath = isDev ? path.resolve(__dirname, '../../', 'update-dev/download') : path.resolve(app.getAppPath(), '..', '..', 'update')
const updateInfo = {
  exist: false,
  dirname: '',
  filename: ''
}

const update = async () => {
  // if (isDev) return
  try {
    const url = 'https://genshin-gacha-export.danmu9.com/update'
    const res = await fetch(`${url}/manifest.json`)
    const data = await res.json()
    if (!data.active) return
    if (semver.gt(data.version, version) && semver.gte(version, data.from)) {
      process.noAsar = true
      await fs.emptyDir(updatePath)
      const filePath = path.join(updatePath, data.name)
      await download(`${url}/${data.name}`, filePath)
      const buffer = await fs.readFile(filePath)
      const sha256 = hash(buffer)
      if (sha256 !== data.hash) return
      await extract(filePath, { dir: updatePath })
      updateInfo.exist = true
      updateInfo.dirname = updatePath
      updateInfo.filename = data.asarName
    }
  } catch (e) {
    sendMsg(e, 'ERROR')
  }
}

const getUpdateInfo = () => updateInfo

setTimeout(update, 3000)

exports.getUpdateInfo = getUpdateInfo

