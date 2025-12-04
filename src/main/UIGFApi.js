const fetch = require('electron-fetch').default
const { readJSON, saveJSON, existsFile } = require('./utils')

const uigfLangMap = new Map([
  ['zh-cn', 'chs'],
  ['zh-tw', 'cht'],
  ['de-de', 'de'],
  ['en-us', 'en'],
  ['es-es', 'es'],
  ['fr-fr', 'fr'],
  ['id-id', 'id'],
  ['ja-jp', 'ja'],
  ['ko-kr', 'kr'],
  ['pt-pt', 'pt'],
  ['ru-ru', 'ru'],
  ['th-th', 'th'],
  ['vi-vn', 'vi']
])

// a dictionary for looking up item ids
const itemIdDict = new Map()
// the md5 value for the dictionary
let itemIdDictMd5 = null
// the file name for saving item id dictionary
const itemIdDictFileName = 'item-id-dict.json'

// acquire dictionary based on give language
const fetchItemIdDict = async (lang = 'all') => {
  // fetch item id dict from api.uigf.org
  const response = await fetch(`https://api.uigf.org/dict/genshin/${lang}.json`)
  // update local dict
  Object.entries(await response.json()).forEach(
    ([lang, table]) => itemIdDict.set(
      // assign item id table based on language, and convert all id from number to string
      lang, new Map(Object.entries(table).map(([name, id]) => [name, String(id)]))
    )
  )
}

// acquire dictionary based on give language
const fetchItemIdDictMd5 = async (lang = 'all') => {
  const response = await fetch('https://api.uigf.org/md5/genshin')
  const responseJson = await response.json()
  return responseJson[lang]
}

// initialize item id dictionary
const initLookupTable = async () => {
  // if itemIdDictMd5 != null, that means itemIdDict has been init, no need to do it again
  if (itemIdDictMd5) {
    return
  }

  // try to obtain dict md5
  try {
    itemIdDictMd5 = await fetchItemIdDictMd5()
  } catch (e) {
    console.log(`Unable to fetch latest item id dictionary md5 due to: ${e}`)
  }

  // if a locally cached dictionary does not exist
  if (!existsFile(itemIdDictFileName)) {
    await fetchItemIdDict();
    return;
  }

  // if a locally cached dictionary is found
  const data = await readJSON(itemIdDictFileName)
  // if itemIdDictMd5 is not successfully fetched previously
  if (!itemIdDictMd5 && data) itemIdDictMd5 = data.md5

  // if the data is null or the md5 does not match
  if (!data || data.md5 !== itemIdDictMd5) {
    // console.log('md5 check failed! Re-fetching...')
    await fetchItemIdDict()
    return;
  }

  // if the data is valid and the md5 matches
  // console.log('md5 check success!')
  data.lang.forEach(([lang, table]) => itemIdDict.set(lang, new Map(table)))
}

// save item id dictionary
const saveLookupTable = async () => {
  await saveJSON(itemIdDictFileName, { lang: itemIdDict, md5: itemIdDictMd5 })
}

// get item id
const getItemId = async (lang, name) => {
  // fetch item id from api.uigf.org if cannot find it from existing item id dictionary
  lang = uigfLangMap.get(lang) || lang
  if (!itemIdDict.has(lang) || !itemIdDict.get(lang).has(name)) {
    const response = await fetch(`https://api.uigf.org/identify/genshin/${name}`)
    const responseJson = await response.json()
    if (!responseJson.item_id) {
      throw new Error(`Couldn't find the item_id for the ${name} (${lang}).`)
    }
    itemIdDict.get(lang).set(name, responseJson.item_id.toString())
  }
  return itemIdDict.get(lang).get(name)
}

module.exports = { initLookupTable, saveLookupTable, getItemId, uigfLangMap }