import * as IconComponents from "@element-plus/icons-vue";
const weaponTypeNames = new Set([
  '武器', 'Weapon', '무기', 'Arma', 'Arme', 'Оружие', 'อาวุธ', 'Vũ Khí', 'Waffe', 'Senjata'
])

const characterTypeNames = new Set([
  '角色', 'Character', '캐릭터', 'キャラクター', 'Personaje', 'Personnage', 'Персонажи', 'ตัวละคร', 'Nhân Vật', 'Figur', 'Karakter', 'Personagem'
])

const cosmeticsNames = new Set([
  '装扮形录'
])

const cosmeticsSetNames = new Set([
  '装扮套装'
])

const cosmeticsPartNames = new Set([
  '装扮部件'
])

const emojiNames = new Set([
  '互动表情'
])

const actionNames = new Set([
  '互动动作'
])

const isCharacter = (name) => characterTypeNames.has(name)
const isWeapon = (name) => weaponTypeNames.has(name)
const isCosmetics = (name)=> cosmeticsNames.has(name)
const isCosmeticSet = (name)=> cosmeticsSetNames.has(name)
const isCosmeticPart = (name)=> cosmeticsPartNames.has(name)
const isEmoji = (name)=> emojiNames.has(name)
const isAction = (name)=> actionNames.has(name)

const IconInstaller = (app) => {
  Object.values(IconComponents).forEach(component => {
    app.component(component.name, component)
  })
}

export {
  isWeapon, isCharacter, isCosmetics, isCosmeticSet, isCosmeticPart, isEmoji, isAction, IconInstaller
}