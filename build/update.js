const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const AdmZip = require('adm-zip')
const { version } = require('../package.json')

const hash = (data, type = 'sha256') => {
  const hmac = crypto.createHmac(type, 'hk4e')
  hmac.update(data)
  return hmac.digest('hex')
}

const createZip = (filePath, name) => {
  const zip = new AdmZip()
  zip.addLocalFile(filePath)
  zip.toBuffer()
  const updatePath = path.resolve('./update/', name)
  zip.writeZip(updatePath)
}

const start = async () => {
  const asarPath = './out/Genshin Gacha Export-win32-x64/resources/app.asar'
  const buffer = await fs.readFile(asarPath)
  const sha256 = hash(buffer)
  const name = sha256.slice(0, 5) + '.zip'
  const outputPath = path.resolve('./update/')
  await fs.ensureDir(outputPath)
  await fs.emptyDir(outputPath)
  createZip(asarPath, name)
  await fs.outputJSON(path.join(outputPath, 'manifest.json'), {
    active: true,
    version,
    from: '0.0.1',
    name,
    asarName: 'app.asar',
    hash: sha256
  })
}

start()