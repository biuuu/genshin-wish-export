const itemTypeMap = {
  "en-us": [{
    key: "200",
    name: "Permanent Wish"
  }, {
    key: "100",
    name: "Novice Wishes"
  }, {
    key: "301",
    name: "Character Event Wish and Character Event Wish-2"
  }, {
    key: "302",
    name: "Weapon Event Wish"
  }],
  "fr-fr": [{
    key: "200",
    name: "Vœux permanents"
  }, {
    key: "100",
    name: "Vœux des débutants"
  }, {
    key: "301",
    name: "Vœux événements de personnage et Vœux événements de personnage - 2"
  }, {
    key: "302",
    name: "Vœux événements d'arme"
  }],
  "de-de": [{
    key: "200",
    name: "Standardgebet"
  }, {
    key: "100",
    name: "Neulingsgebete"
  }, {
    key: "301",
    name: "Figurenaktionsgebet und Figurenaktionsgebet 2"
  }, {
    key: "302",
    name: "Waffenaktionsgebet"
  }],
  "es-es": [{
    key: "200",
    name: "Gachapón permanente"
  }, {
    key: "100",
    name: "Gachapón de principiante"
  }, {
    key: "301",
    name: "Gachapón promocional de personaje y gachapón promocional de personaje 2"
  }, {
    key: "302",
    name: "Gachapón promocional de arma"
  }],
  "pt-pt": [{
    key: "200",
    name: "Desejo Comum"
  }, {
    key: "100",
    name: "Desejos de Novato"
  }, {
    key: "301",
    name: "Oração de Evento de Personagem e Oração de Evento de Personagem - 2"
  }, {
    key: "302",
    name: "Oração do Evento de Arma"
  }],
  "ru-ru": [{
    key: "200",
    name: "Стандартная молитва"
  }, {
    key: "100",
    name: "Молитва новичка"
  }, {
    key: "301",
    name: "Молитва события персонажа и Молитва события персонажа II"
  }, {
    key: "302",
    name: "Молитва события оружия"
  }],
  "ja-jp": [{
    key: "200",
    name: "通常祈願"
  }, {
    key: "100",
    name: "初心者向け祈願"
  }, {
    key: "301",
    name: "イベント祈願・キャラクターとイベント祈願・キャラクター 2"
  }, {
    key: "302",
    name: "イベント祈願・武器"
  }],
  "ko-kr": [{
    key: "200",
    name: "상주 기원"
  }, {
    key: "100",
    name: "초심자 기원"
  }, {
    key: "301",
    name: "캐릭터 이벤트 기원 및 캐릭터 이벤트 기원-2"
  }, {
    key: "302",
    name: "무기 이벤트 기원"
  }],
  "th-th": [{
    key: "200",
    name: "อธิษฐานถาวร"
  }, {
    key: "100",
    name: "ผู้เริ่มอธิษฐาน"
  }, {
    key: "301",
    name: "กิจกรรมอธิษฐานตัวละครและกิจกรรมอธิษฐานตัวละคร - 2"
  }, {
    key: "302",
    name: "กิจกรรมอธิษฐานอาวุธ"
  }],
  "vi-vn": [{
    key: "200",
    name: "Cầu Nguyện Thường"
  }, {
    key: "100",
    name: "Cầu Nguyện Tân Thủ"
  }, {
    key: "301",
    name: "Cầu Nguyện Nhân Vật và Cầu Nguyện Nhân Vật-2"
  }, {
    key: "302",
    name: "Cầu Nguyện Vũ Khí"
  }],
  "id-id": [{
    key: "200",
    name: "Permohonan Standar"
  }, {
    key: "100",
    name: "Permohonan Pemula"
  }, {
    key: "301",
    name: "Event Permohonan Karakter dan Event Permohonan Karakter - 2"
  }, {
    key: "302",
    name: "Event Permohonan Senjata"
  }],
  "zh-cn": [{
    key: "200",
    name: "常驻祈愿"
  }, {
    key: "100",
    name: "新手祈愿"
  }, {
    key: "301",
    name: "角色活动祈愿与角色活动祈愿-2"
  }, {
    key: "302",
    name: "武器活动祈愿"
  }],
  "zh-tw": [{
    key: "200",
    name: "常駐祈願"
  }, {
    key: "100",
    name: "新手祈願"
  }, {
    key: "301",
    name: "角色活動祈願與角色活動祈願-2"
  }, {
    key: "302",
    name: "武器活動祈願"
  }]
}
const itemTypeNameMap = {
  "en-us": [{
    key: "200",
    name: "Permanent Wish"
  }, {
    key: "100",
    name: "Novice Wishes"
  }, {
    key: "301",
    name: "Character Event Wish"
  }, {
    key: "302",
    name: "Weapon Event Wish"
  }, {
    key: "400",
    name: "Character Event Wish-2"
  }],
  "fr-fr": [{
    key: "200",
    name: "Vœux permanents"
  }, {
    key: "100",
    name: "Vœux des débutants"
  }, {
    key: "301",
    name: "Vœux événements de personnage"
  }, {
    key: "302",
    name: "Vœux événements d'arme"
  }, {
    key: "400",
    name: "Vœux événements de personnage - 2"
  }],
  "de-de": [{
    key: "200",
    name: "Standardgebet"
  }, {
    key: "100",
    name: "Neulingsgebete"
  }, {
    key: "301",
    name: "Figurenaktionsgebet"
  }, {
    key: "302",
    name: "Waffenaktionsgebet"
  }, {
    key: "400",
    name: "Figurenaktionsgebet 2"
  }],
  "es-es": [{
    key: "200",
    name: "Gachapón permanente"
  }, {
    key: "100",
    name: "Gachapón de principiante"
  }, {
    key: "301",
    name: "Gachapón promocional de personaje"
  }, {
    key: "302",
    name: "Gachapón promocional de arma"
  }, {
    key: "400",
    name: "Gachapón promocional de personaje 2"
  }],
  "pt-pt": [{
    key: "200",
    name: "Desejo Comum"
  }, {
    key: "100",
    name: "Desejos de Novato"
  }, {
    key: "301",
    name: "Oração do Evento do Personagem"
  }, {
    key: "302",
    name: "Oração do Evento de Arma"
  }, {
    key: "400",
    name: "Oração de Evento de Personagem - 2"
  }],
  "ru-ru": [{
    key: "200",
    name: "Стандартная молитва"
  }, {
    key: "100",
    name: "Молитва новичка"
  }, {
    key: "301",
    name: "Молитва события персонажа"
  }, {
    key: "302",
    name: "Молитва события оружия"
  }, {
    key: "400",
    name: "Молитва события персонажа II"
  }],
  "ja-jp": [{
    key: "200",
    name: "通常祈願"
  }, {
    key: "100",
    name: "初心者向け祈願"
  }, {
    key: "301",
    name: "イベント祈願・キャラクター"
  }, {
    key: "302",
    name: "イベント祈願・武器"
  }, {
    key: "400",
    name: "イベント祈願・キャラクター 2"
  }],
  "ko-kr": [{
    key: "200",
    name: "상주 기원"
  }, {
    key: "100",
    name: "초심자 기원"
  }, {
    key: "301",
    name: "캐릭터 이벤트 기원"
  }, {
    key: "302",
    name: "무기 이벤트 기원"
  }, {
    key: "400",
    name: "캐릭터 이벤트 기원-2"
  }],
  "th-th": [{
    key: "200",
    name: "อธิษฐานถาวร"
  }, {
    key: "100",
    name: "ผู้เริ่มอธิษฐาน"
  }, {
    key: "301",
    name: "กิจกรรมอธิษฐานตัวละคร"
  }, {
    key: "302",
    name: "กิจกรรมอธิษฐานอาวุธ"
  }, {
    key: "400",
    name: "กิจกรรมอธิษฐานตัวละคร - 2"
  }],
  "vi-vn": [{
    key: "200",
    name: "Cầu Nguyện Thường"
  }, {
    key: "100",
    name: "Cầu Nguyện Tân Thủ"
  }, {
    key: "301",
    name: "Cầu Nguyện Nhân Vật"
  }, {
    key: "302",
    name: "Cầu Nguyện Vũ Khí"
  }, {
    key: "400",
    name: "Cầu Nguyện Nhân Vật-2"
  }],
  "id-id": [{
    key: "200",
    name: "Permohonan Standar"
  }, {
    key: "100",
    name: "Permohonan Pemula"
  }, {
    key: "301",
    name: "Event Permohonan Karakter"
  }, {
    key: "302",
    name: "Event Permohonan Senjata"
  }, {
    key: "400",
    name: "Event Permohonan Karakter - 2"
  }],
  "zh-cn": [{
    key: "200",
    name: "常驻祈愿"
  }, {
    key: "100",
    name: "新手祈愿"
  }, {
    key: "301",
    name: "角色活动祈愿"
  }, {
    key: "302",
    name: "武器活动祈愿"
  }, {
    key: "400",
    name: "角色活动祈愿-2"
  }],
  "zh-tw": [{
    key: "200",
    name: "常駐祈願"
  }, {
    key: "100",
    name: "新手祈願"
  }, {
    key: "301",
    name: "角色活動祈願"
  }, {
    key: "302",
    name: "武器活動祈願"
  }, {
    key: "400",
    name: "角色活動祈願-2"
  }]
}

function convertItemTypeMap(mapObject) {
  const convertedItemTypeMap = new Map()
  Object.entries(mapObject).forEach(([_, itemType]) => convertedItemTypeMap.set(itemType.key, itemType.name))
  return convertedItemTypeMap
}

export function getItemTypeMap(lang) {
  return convertItemTypeMap(itemTypeMap[lang])
}

export function getItemTypeNameMap(lang) {
  return convertItemTypeMap(itemTypeNameMap[lang])
}