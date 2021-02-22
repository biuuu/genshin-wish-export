const { app } = require('electron')
const fetch = require('electron-fetch').default
const semver = require('semver')
const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const extract = require('../module/extract-zip')
const { version } = require('../../package.json')
const { hash, sendMsg } = require('../utils')
const streamPipeline = util.promisify(require('stream').pipeline)

async function download(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
  await streamPipeline(response.body, fs.createWriteStream(filePath))
}

const isDev = !app.isPackaged
const appPath = app.getAppPath()
const updatePath = isDev ? path.resolve(__dirname, '../../', 'update-dev/download') : path.resolve(appPath, '..', '..', 'update')

const update = async () => {
  // if (isDev) return
  try {
    const url = 'https://genshin-gacha-export.danmu9.com/update'
    const res = await fetch(`${url}/manifest.json?t=${Math.floor(Date.now() / (1000 * 60 * 10))}`)
    const data = await res.json()
    if (!data.active) return
    if (semver.gt(data.version, version) && semver.gte(version, data.from)) {
      await fs.emptyDir(updatePath)
      const filePath = path.join(updatePath, data.name)
      await download(`${url}/${data.name}`, filePath)
      const buffer = await fs.readFile(filePath)
      const sha256 = hash(buffer)
      if (sha256 !== data.hash) return
      const appPathTemp = path.join(updatePath, 'app')
      await extract(filePath, { dir: appPathTemp })
      await fs.emptyDir(appPath)
      await fs.copy(appPathTemp, appPath)
    }
  } catch (e) {
    sendMsg(e, 'ERROR')
  }
}

const getUpdateInfo = () => updateInfo

setTimeout(update, 1000)

exports.getUpdateInfo = getUpdateInfo

