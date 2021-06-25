const raw = {
  'zh-cn': require('../i18n/简体中文.json'),
  'zh-tw': require('../i18n/繁體中文.json'),
  'de-de': require('../i18n/Deutsch.json'),
  'en-us': require('../i18n/English.json'),
  'es-es': require('../i18n/Español.json'),
  'fr-fr': require('../i18n/Français.json'),
  'id-id': require('../i18n/Indonesia.json'),
  'ja-jp': require('../i18n/日本語.json'),
  'ko-kr': require('../i18n/한국어.json'),
  'pt-pt': require('../i18n/Português.json'),
  'ru-ru': require('../i18n/Pусский.json'),
  'th-th': require('../i18n/ภาษาไทย.json'),
  'vi-vn': require('../i18n/Tiếng Việt.json')
}
const config = require('./config')
const isPlainObject = require('lodash/isPlainObject')

const addProp = (obj, key) => {
  if (isPlainObject(obj[key])) {
    return obj[key]
  } else if (typeof obj[key] === 'undefined') {
    let temp = {}
    obj[key] = temp
    return temp
  }
}

const parseData = (data) => {
  const result = {}
  for (let key in data) {
    let temp = result
    const arr = key.split('.')
    arr.forEach((prop, index) => {
      if (index === arr.length - 1) {
        temp[prop] = data[key]
      } else {
        temp = addProp(temp, prop)
      }
    })
  }
  return result
}

const i18nMap = new Map()
const prepareData = () => {
  for (let key in raw) {
    let temp = {}
    if (key === 'zh-tw') {
      Object.assign(temp, raw['zh-cn'], raw[key])
    } else {
      Object.assign(temp, raw['zh-cn'], raw['en-us'], raw[key])
    }
    i18nMap.set(key, parseData(temp))
  }
}

prepareData()

const parseText = (text, data) => {
  return text.replace(/(\${.+?})/g, function (...args) {
    const key = args[0].slice(2, args[0].length - 1)
    if (data[key]) return data[key]
    return args[0]
  })
}

const mainProps = [
  'symbol', 'ui', 'log', 'excel'
]

const i18n = new Proxy(raw, {
  get (obj, prop) {
    if (prop === 'data') {
      return i18nMap.get(config.lang)
    } else if (mainProps.includes(prop)) {
      return i18nMap.get(config.lang)[prop]
    } else if (prop === 'parse') {
      return parseText
    }
    return obj[prop]
  }
})

module.exports = i18n











