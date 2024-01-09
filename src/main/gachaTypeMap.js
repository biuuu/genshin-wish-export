
const { order } = require('./getData')
const itemTypeNameMap = require('../gachaType.json')

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

exports.getItemTypeNameMap = function(lang) {
  return convertItemTypeMap(itemTypeNameMap[lang])
}