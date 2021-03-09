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

const createZip = (filePath, dest) => {
  const zip = new AdmZip()
  zip.addLocalFolder(filePath)
  zip.toBuffer()
  zip.writeZip(dest)
}

const start = async () => {
  copyAppZip()
  const appPath = './build/win-unpacked/resources/app'
  const name = 'app.zip'
  const outputPath = path.resolve('./build/update/update/')
  const zipPath = path.resolve(outputPath, name)
  await fs.ensureDir(outputPath)
  await fs.emptyDir(outputPath)
  await fs.outputFile('./build/update/CNAME', 'genshin-gacha-export.danmu9.com')
  createZip(appPath, zipPath)
  const buffer = await fs.readFile(zipPath)
  const sha256 = hash(buffer)
  const hashName = sha256.slice(7, 12)
  await fs.copy(zipPath, path.resolve(outputPath, `${hashName}.zip`))
  await fs.remove(zipPath)
  await fs.outputJSON(path.join(outputPath, 'manifest.json'), {
    active: true,
    version,
    from: '0.1.5',
    name: `${hashName}.zip`,
    hash: sha256
  })
}

const copyAppZip = () => {
  try {
    const dir = path.resolve('./build')
    const filePath = path.resolve(dir, `Genshin Wish Export-${version}-win.zip`)
    fs.copySync(filePath, path.join(dir, 'app.zip'))
  } catch (e) {}
}

start()