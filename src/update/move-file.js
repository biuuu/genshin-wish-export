const ofs = require('original-fs')
const fs = require('fs-extra')
const path = require('path')

process.noAsar = true
const { dirname, filename, appRoot } = process.env
const start = () => {
  const resPath = path.resolve(appRoot, 'resources')


  ofs.copyFile(path.resolve(dirname, filename), path.resolve(resPath, filename), (err) => {
    if (err) {
      fs.outputFileSync(path.resolve(appRoot, '123.txt'), err)
      throw err
    }
  })
}

setTimeout(start, 5000)