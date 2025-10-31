import { isWeapon, isCharacter, isCosmetics, isCosmeticSet, isCosmeticPart, isEmoji, isAction } from './utils'

const itemCount = (map, name) => {
  if (!map.has(name)) {
    map.set(name, 1)
  } else {
    map.set(name, map.get(name) + 1)
  }
}

const gachaDetail = (data) => {
  const detailMap = new Map()
  for (let [key, value] of data) {
    let detail = {
      count3: 0, count4: 0, count5: 0, count2: 0,
      count3w: 0, count4w: 0, count5w: 0, count4c: 0, count5c: 0,
      count5co: 0, count4co: 0, count3co: 0, count2co: 0,
      count5cos: 0, count4cos: 0,
      count3cop: 0,
      count3e: 0,
      count3a: 0,
      weapon3: new Map(), weapon4: new Map(), weapon5: new Map(),
      char4: new Map(), char5: new Map(),
      cosmetics2: new Map(), cosmetics3: new Map(), cosmetics4: new Map(), cosmetics5: new Map(),
      cosmeticSet5: new Map(), cosmeticSet4: new Map(),
      cosmeticPart3: new Map(),
      emoji3: new Map(),
      action3: new Map(),
      date: [],
      ssrPos: [], countMio: 0, total: value.length
    }
    let lastSSR = 0
    let dateMin = 0
    let dateMax = 0
    value.forEach((item, index) => {
      const [time, name, type, rank, wishType] = item
      const timestamp = new Date(time).getTime()
      if (!dateMin) dateMin = timestamp
      if (!dateMax) dateMax = timestamp
      if (dateMin > timestamp) dateMin = timestamp
      if (dateMax < timestamp) dateMax = timestamp
      if (rank === 2) {
        detail.count2++
        if (isCosmetics(type)) {
            detail.count2co++
            itemCount(detail.cosmetics2, name)
        }
      } else if (rank === 3) {
        detail.count3++
        detail.countMio++
        if (isWeapon(type)) {
          detail.count3w++
          itemCount(detail.weapon3, name)
        } else if (isCosmetics(type)) {
            detail.count3co++
            itemCount(detail.cosmetics3, name)
        } else if (isEmoji(type)) {
            detail.count3e++
            itemCount(detail.emoji3, name)
        } else if (isAction(type)) {
            detail.count3a++
            itemCount(detail.action3, name)
        } else if (isCosmeticPart(type)) {
            detail.count3cop++
            itemCount(detail.cosmeticPart3, name)
        }
      } else if (rank === 4) {
        detail.count4++
        detail.countMio++
        if (isWeapon(type)) {
          detail.count4w++
          itemCount(detail.weapon4, name)
        } else if (isCharacter(type)) {
          detail.count4c++
          itemCount(detail.char4, name)
        } else if (isCosmetics(type)) {
            detail.count4co++
            itemCount(detail.cosmetics4, name)
        } else if (isCosmeticSet(type)) {
            detail.count4cos++
            itemCount(detail.cosmeticSet4, name)
        }
      } else if (rank === 5) {
        detail.ssrPos.push([name, index + 1 - lastSSR, time, wishType])
        lastSSR = index + 1
        detail.count5++
        detail.countMio = 0
        if (isWeapon(type)) {
          detail.count5w++
          itemCount(detail.weapon5, name)
        } else if (isCharacter(type)) {
          detail.count5c++
          itemCount(detail.char5, name)
        } else if (isCosmetics(type)) {
            detail.count5co++
            itemCount(detail.cosmetics5, name)
        } else if (isCosmeticSet(type)) {
            detail.count5cos++
            itemCount(detail.cosmeticSet5, name)
        }
      }
    })
    detail.date = [dateMin, dateMax]
    if (detail.total) {
      detailMap.set(key, detail)
    }
  }
  return detailMap
}

export default gachaDetail