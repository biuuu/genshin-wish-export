const fs =  require('fs-extra')
const langMap = new Map([
  ['zh-cn', '简体中文'],
  ['zh-tw', '繁體中文'],
  ['de-de', 'Deutsch'],
  ['en-us', 'English'],
  ['es-es', 'Español'],
  ['fr-fr', 'Français'],
  ['id-id', 'Indonesia'],
  ['ja-jp', '日本語'],
  ['ko-kr', '한국어'],
  ['pt-pt', 'Português'],
  ['ru-ru', 'Pусский'],
  ['th-th', 'ภาษาไทย'],
  ['vi-vn', 'Tiếng Việt']
])
const start = async () => {
  for (let [key, value] of langMap) {
    await fs.copyFile('./src/i18n/zh-cn.json', `./src/i18n/${value}.json`)
  }
}
start()