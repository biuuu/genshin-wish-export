const { readJSON, saveJSON, decipherAes, cipherAes, detectLocale } = require('./utils')

const config = {
  urls: [],
  logType: 0,
  lang: detectLocale(),
  current: 0,
  proxyPort: 8325,
  proxyMode: false,
  autoUpdate: true
}

const getLocalConfig = async () => {
  const localConfig = await readJSON('config.json')
  if (!localConfig) return
  const configTemp = {}
  for (let key in localConfig) {
    if (typeof config[key] !== 'undefined') {
      configTemp[key] = localConfig[key]
    }
  }
  configTemp.urls.forEach(item => {
    try {
      item[1] = decipherAes(item[1])
    } catch (e) {
      item[1] = ''
    }
  })
  Object.assign(config, configTemp)
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

const getPlainConfig = () => config

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
    } else if (prop === 'value') {
      return getPlainConfig
    }
    return obj[prop]
  }
})

module.exports = configProxy