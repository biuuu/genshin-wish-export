const fetch = require('electron-fetch').default
const { readJSON, saveJSON, existsFile, md5, mapToObject } = require('./utils')

const uigfLangMap = new Map([
  ['zh-cn', 'chs'],
  ['zh-tw', 'cht'],
  ['de-de', 'de'],
  ['en-us', 'en'],
  ['es-es', 'es'],
  ['fr-fr', 'fr'],
  ['id-id', 'id'],
  ['ja-jp', 'jp'],
  ['ko-kr', 'kr'],
  ['pt-pt', 'pt'],
  ['ru-ru', 'ru'],
  ['th-th', 'th'],
  ['vi-vn', 'vi']
])

const uigfRevLangMap = new Map(Array.from(uigfLangMap, ([key, value]) => [value, key]))

// a dictionary for looking up item ids
const itemIdDict = new Map()
// the md5 value for the dictionary
const itemIdDictMd5 = new Map()
// the file name for saving item id dictionary
const itemIdDictFileName = 'item-id-dict.json'

// acquire dictionary based on give language
const fetchItemIdDict = async () => {
  // fetch item id dicts from api.uigf.org
  let response = await fetch(`https://api.uigf.org/dict/genshin/all.json`)
  let responseJson = await response.json()
  if (response.status === 200) { // successfully fetched all.json
    Object.entries(responseJson).forEach(([lang, dict]) => {
      itemIdDict.set(lang, new Map(Object.entries(dict).map(([name, id]) => [name, String(id)])))
    })
  } else { // all.json failed, attempting to fetch individual languages
    console.error(`All dict fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
    for (const [_, lang] of uigfLangMap) {
      response = await fetch(`https://api.uigf.org/dict/genshin/${lang}.json`)
      const responseText = await response.text().catch((e) => console.error(e))
      responseJson = JSON.parse(responseText)
      if (response.status !== 200) {
        console.error(`${lang} dict fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
        continue
      }
      itemIdDict.set(lang, new Map(Object.entries(responseJson).map(([name, id]) => [name, String(id)])))
      itemIdDictMd5.set(lang, md5(responseText))
    }
  }
}

// acquire dictionary based on give language
const fetchItemIdDictMd5 = async (lang = 'all') => {
  const response = await fetch('https://api.uigf.org/md5/genshin')
  const responseJson = await response.json()
  if (response.status !== 200) throw new Error(`MD5 fetch failed: HTTP ${response.status}: ` + (responseJson.detail || 'unknown error'))
  Object.entries(responseJson).forEach(([lang, hash]) => itemIdDictMd5.set(lang, hash))
}

// initialize item id dictionary
const initLookupTable = async () => {
  // check if itemIdDict has been init, no need to do it again
  if (itemIdDict.size > 0) {
    return
  }

  // fetch the remote MD5 hashes
  await fetchItemIdDictMd5().catch((e) => console.error(e))

  // if a locally cached dictionary does not exist, fetch a new copy
  if (!existsFile(itemIdDictFileName)) {
    await fetchItemIdDict();
    return;
  }

  // load the locally cached dictionary
  const localItemIdDict = await readJSON(itemIdDictFileName)

  // if localItemIdDict is empty or old version, refetch
  if (!localItemIdDict || typeof localItemIdDict.md5 === "string") {
    await fetchItemIdDict()
    return
  }

  // ensure all remote md5 matches local hashes
  for (const [lang, hash] of itemIdDictMd5.entries()) {
    const localHash = localItemIdDict.md5[lang] || ''
    if (localHash !== hash) {
      await fetchItemIdDict()
      return
    }
  }

  // insert locally cached dicts into memory
  for (const [lang, dict] of Object.entries(localItemIdDict.lang)) {
    itemIdDict.set(lang, new Map(Object.entries(dict).map(([name, id]) => [name, String(id)])))
  }
}

// save item id dictionary
const saveLookupTable = async () => {
  await saveJSON(itemIdDictFileName, { lang: mapToObject(itemIdDict), md5: mapToObject(itemIdDictMd5) })
}

// get item id
const getItemId = async (lang, name) => {
  // fetch item id from api.uigf.org if cannot find it from existing item id dictionary
  lang = uigfLangMap.get(lang) || lang
  if (!itemIdDict.has(lang) || !itemIdDict.get(lang).has(name)) {
    const response = await fetch(`https://api.uigf.org/identify/genshin/${name}`)
    const responseJson = await response.json()
    if (response.status != 200) {
      throw new Error(`Couldn't find the item_id for the ${name}.`)
    }
    itemIdDict.get(lang).set(name, responseJson.matched[0].item_id.toString())
  }
  return itemIdDict.get(lang).get(name)
}

module.exports = { initLookupTable, saveLookupTable, getItemId, uigfLangMap, uigfRevLangMap }