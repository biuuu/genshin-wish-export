const { initLookupTable, saveLookupTable, getItemId } = require('./UIGFApi.js')

const stndBannerChars = new Map([
    ['10000003', new Date('2020-09-28T10:00+08:00')], // Version 1.0, Jean
    ['10000016', new Date('2020-09-28T10:00+08:00')], // Version 1.0, Diluc
    ['10000035', new Date('2020-09-28T10:00+08:00')], // Version 1.0, Qiqi
    ['10000041', new Date('2020-09-28T10:00+08:00')], // Version 1.0, Mona
    ['10000042', new Date('2020-09-28T10:00+08:00')], // Version 1.0, Keqing
    ['10000069', new Date('2022-09-28T07:00+08:00')], // Version 3.1, Tighnari
    ['10000079', new Date('2023-04-12T07:00+08:00')], // Version 3.6, Dehya
    ['10000109', new Date('2025-03-26T07:00+08:00')] // Version 5.5, Yumemizuki Mizuki
])

const capturingRadianceStartDate = new Date("2024-08-28T11:00+08:00")

const weaponTypeNames = new Set([
  '武器', 'Weapon', '무기', 'Arma', 'Arme', 'Оружие', 'อาวุธ', 'Vũ Khí', 'Waffe', 'Senjata'
])

const characterTypeNames = new Set([
  '角色', 'Character', '캐릭터', 'キャラクター', 'Personaje', 'Personnage', 'Персонажи', 'ตัวละคร', 'Nhân Vật', 'Figur', 'Karakter', 'Personagem'
])

const isCharacter = (name) => characterTypeNames.has(name)
const isWeapon = (name) => weaponTypeNames.has(name)

const itemCount = (map, name) => {
  if (!map.has(name)) {
    map.set(name, 1)
  } else {
    map.set(name, map.get(name) + 1)
  }
}

// TODO: allow capturingRadiance to survive if uigf api is down/not working nicely, perhaps store all std banner chars separately and ship funciton for them?
const gachaStats = async(gacha, lang) => {
    await initLookupTable()
    const stats = new Map()
    for (const [gachaType, gachaLog] of gacha) {
        let gachaDetail = {
            count3: 0, count4: 0, count5: 0,
            count3w: 0, count4w: 0, count5w: 0,
            count4c: 0, count5c: 0,
            weapon3: new Map(), weapon4: new Map(), weapon5: new Map(),
            char4: new Map(), char5: new Map(),
            date: [],
            ssrPos: [], countMio: 0, total: gachaLog.length,
            capturingRadiance: undefined
        }
        let lastSSR = 0
        let dateMin = Infinity
        let dateMax = 0
        const calculateCapturingRadiance = capturingRadianceFunction(lang)
        await Promise.all(gachaLog.map(async ([time, name, type, rank, wishType], index) => {
            const timestamp = new Date(time).getTime()
            dateMin = Math.min(timestamp, dateMin)
            dateMax = Math.max(timestamp, dateMax)
            if (rank === 3) {
                gachaDetail.count3++
                gachaDetail.countMio++
                if (isWeapon(type)) {
                    gachaDetail.count3w++
                    itemCount(gachaDetail.weapon3, name)
                }
            } else if (rank === 4) {
                gachaDetail.count4++
                gachaDetail.countMio++
                if (isWeapon(type)) {
                    gachaDetail.count4w++
                    itemCount(gachaDetail.weapon4, name)
                } else if (isCharacter(type)) {
                    gachaDetail.count4c++
                    itemCount(gachaDetail.char4, name)
                }
            } else if (rank === 5) {
                gachaDetail.ssrPos.push([
                    name,
                    index + 1 - lastSSR,
                    time,
                    wishType
                ])
                lastSSR = index + 1
                gachaDetail.count5++
                gachaDetail.countMio++
                if (isWeapon(type)) {
                    gachaDetail.count5w++
                    itemCount(gachaDetail.weapon5, name)
                } else if (isCharacter(type)) {
                    gachaDetail.count5c++
                    itemCount(gachaDetail.char5, name)
                }
                if (gachaType === '301') {
                    gachaDetail.capturingRadiance = await calculateCapturingRadiance(time, name)
                }
            }
        }))
        gachaDetail.date = [dateMin, dateMax]
        if (gachaDetail.total > 0) stats.set(gachaType, gachaDetail)
    }
    await saveLookupTable()
    return stats
}

const capturingRadianceFunction = (lang) => {
    let counter = 1
    let guarantee = 0
    return async (time, name) => {
        const itemDate = new Date(time)
        const itemId = await(getItemId(lang, name))
        const isStandardCharacter = stndBannerChars.get(itemId) < itemDate
        if (isStandardCharacter) {
            // Lost 50/50, set guarantee, and increment radiance counter
            guarantee = 1
            if (itemDate > capturingRadianceStartDate) {
                counter = Math.min(3, counter + 1)
            }
        } else { // Limited Character
            if (guarantee) {
                // Guarantee, no change to radiance counter
            } else {
                // Won 50/50, reset/decrement radiance counter
                if (itemDate > capturingRadianceStartDate) {
                    counter = counter > 1 ? 1 : 0
                }
            }
            guarantee = 0
        }
        return counter
    }
}

module.exports = { gachaStats }