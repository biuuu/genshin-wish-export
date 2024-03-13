const itemTypeNameMap = require('../gachaType.json')

const order = ['301', '302', '200', '500', '100']

function convertItemTypeMap(mapObject) {
  const convertedItemTypeMap = new Map()
  order.forEach(id => {
    const itemType = mapObject.find(item => {
      return item.key === id
    })
    convertedItemTypeMap.set(itemType.key, itemType.name)
  })
  return convertedItemTypeMap
}

exports.getItemTypeNameMap = function(language) {
  const lang = language.startsWith('zh-') || language.includes('-')
    ? language
    : Object.keys(itemTypeNameMap).find(key => key.startsWith(language + '-'))
  return convertItemTypeMap(itemTypeNameMap[lang])
}