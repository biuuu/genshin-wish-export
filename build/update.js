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

const createZip = (filePath, name, dest) => {
  const zip = new AdmZip()
  zip.addLocalFile(filePath)
  zip.toBuffer()
  const ZipFilePath = path.resolve(dest, name)
  zip.writeZip(ZipFilePath)
}

const start = async () => {
  copyAppZip()
  const asarPath = './out/Genshin Gacha Export-win32-x64/resources/app.asar'
  const name = sha256.slice(0, 5) + '.zip'
  const outputPath = path.resolve('./update/update/')
  await fs.ensureDir(outputPath)
  await fs.emptyDir(outputPath)
  await fs.outputFile('./update/CNAME', 'genshin-gacha-export.danmu9.com')
  createZip(asarPath, name, outputPath)
  const buffer = await fs.readFile(path.resolve(outputPath, name))
  const sha256 = hash(buffer)
  await fs.outputJSON(path.join(outputPath, 'manifest.json'), {
    active: true,
    version,
    from: '0.0.1',
    name,
    asarName: 'app.asar',
    hash: sha256
  })
}

const copyAppZip = () => {
  try {
    const dir = path.resolve('./out/make/zip/win32/x64/')
    const filePath = path.resolve(dir, `Genshin Gacha Export-win32-x64-${version}.zip`)
    fs.copySync(filePath, path.join(dir, 'app.zip'))
  } catch (e) {}
}

start()