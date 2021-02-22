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

const updateInfo = {
  status: 'init'
}

const isDev = !app.isPackaged
const appPath = isDev ? path.resolve(__dirname, '../../', 'update-dev/app'): app.getAppPath()
const updatePath = isDev ? path.resolve(__dirname, '../../', 'update-dev/download') : path.resolve(appPath, '..', '..', 'update')

const update = async () => {
  // Disabled this for security concerns. Hope the original author can support i18n ASAP. XD
}

const getUpdateInfo = () => updateInfo

setTimeout(update, 1000)

exports.getUpdateInfo = getUpdateInfo

