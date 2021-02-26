const { readJSON, saveJSON, decipherAes, cipherAes } = require('./utils')

const config = {
  urls: [],
  logDir: 'auto',
  locales: 'auto',
  current: 0,
  proxyPort: 8325,
  mode: 'log'
}

const getLocalConfig = async () => {
  const localConfig = await readJSON('config.json')
  if (!localConfig) return
  localConfig.urls.forEach(item => {
    try {
      item[1] = decipherAes(item[1])
    } catch (e) {
      item[1] = ''
    }
  })
  Object.assign(config, localConfig)
}

getLocalConfig()

let urlsMap = null
const setConfig = (key, value) => {
  Reflect.set(config, key, value)
}

const saveConfig = async () => {
  let configTemp = config
  if (urlsMap) {
    const urls = [...urlsMap]
    urls.forEach(item => {
      try {
        item[1] = cipherAes(item[1])
      } catch (e) {
        item[1] = ''
      }
    })
    configTemp = Object.assign({}, config, { urls })
  }
  await saveJSON('config.json', configTemp)
}

const configProxy = new Proxy(config, {
  get: function (obj, prop) {
    if (prop === 'urls') {
      if (!urlsMap) {
        urlsMap = new Map(obj[prop])
      }
      return urlsMap
    } else if (prop === 'set') {
      return setConfig
    } else if (prop === 'save') {
      return saveConfig
    }
    return obj[prop]
  }
})

module.exports = configProxy