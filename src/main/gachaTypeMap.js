
const { order } = require('./getData')
const itemTypeNameMap = require('../gachaType.json')

function convertItemTypeMap(mapObject) {
  const convertedItemTypeMap = new Map()
  Object.entries(mapObject).forEach(([_, itemType]) => convertedItemTypeMap.set(itemType.key, itemType.name))
  return convertedItemTypeMap
}

exports.getItemTypeNameMap = function(lang) {
  return convertItemTypeMap(itemTypeNameMap[lang])
}