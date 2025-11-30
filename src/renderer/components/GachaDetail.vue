<template>
  <p class="text-gray-500 text-xs mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(detail.date[0]).toLocaleString()">{{new Date(detail.date[0]).toLocaleDateString()}}</span>
    -
    <span class="mx-2" :title="new Date(detail.date[1]).toLocaleString()">{{new Date(detail.date[1]).toLocaleDateString()}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span class="mr-1">{{text.total}}
      <span class="text-blue-600">{{detail.total}}</span> {{text.times}}
    </span>
    <span v-if="type !== '100'">{{text.sum}}<span class="mx-1 text-green-600">{{detail.countMio}}</span>{{text.no5star}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span :title="`${text.character}${colon}${detail.count5c}\n${text.weapon}${colon}${detail.count5w}`" class="mr-3 whitespace-pre cursor-help text-yellow-500">
      <span class="min-w-10 inline-block">{{text.star5}}{{colon}}{{detail.count5}}</span>
      [{{percent(detail.count5, detail.total)}}]
    </span>
    <br><span :title="`${text.character}${colon}${detail.count4c}\n${text.weapon}${colon}${detail.count4w}`" class="mr-3 whitespace-pre cursor-help text-purple-600">
      <span class="min-w-10 inline-block">{{text.star4}}{{colon}}{{detail.count4}}</span>
      [{{percent(detail.count4, detail.total)}}]
    </span>
    <br><span class="text-blue-500 whitespace-pre">
      <span class="min-w-10 inline-block">{{text.star3}}{{colon}}{{detail.count3}}</span>
      [{{percent(detail.count3, detail.total)}}]
    </span>
  </p>

  <p class="text-gray-600 text-xs mb-1" v-if="detail.ssrPos.length">
    {{text.history}}{{colon}}
    <span :title="`${item[2]}${item[3] === '400' ? '\n' + props.i18n.excel.wish2 : ''}`" :class="{wish2: item[3] === '400'}" class="cursor-help mr-1" :style="`color:${colorList[index]}`"
      v-for="(item, index) of detail.ssrPos" :key="item"
    >
      {{item[0]}}[{{item[1]}}]
    </span>
  </p>
  <p v-if="detail.ssrPos.length" class="text-gray-600 text-xs">{{text.average}}{{colon}}<span class="text-green-600">{{avg5(detail.ssrPos)}}</span></p>
  <p v-if="type === '301'" :title="capturingRadianceHelpText" class="text-gray-600 text-xs cursor-help">Capturing radiance counter{{colon}}<span :class="capturingRadianceHelpMap.get(capturingRadianceCounter)[1]">{{capturingRadianceCounter}}</span></p>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: Object,
  typeMap: Map,
  i18n: Object
})

const type = computed(() => props.data[0])
const detail = computed(() => props.data[1])
const text = computed(() => props.i18n.ui.data)
const colon = computed(() => props.i18n.symbol.colon)

const stndBannerChars = new Map([ // todo fetch from back-end with name translations
      ["Jean", new Date("2020-09-28T10:00+08:00")], // Version 1.0
      ["Diluc", new Date("2020-09-28T10:00+08:00")], // Version 1.0
      ["Qiqi", new Date("2020-09-28T10:00+08:00")], // Version 1.0
      ["Mona", new Date("2020-09-28T10:00+08:00")], // Version 1.0
      ["Keqing", new Date("2020-09-28T10:00+08:00")], // Version 1.0
      ["Tighnari", new Date("2022-09-28T07:00+08:00")], // Version 3.1
      ["Dehya", new Date("2023-04-12T07:00+08:00")], // Version 3.6
      ["Yumemizuki Mizuki", new Date("2025-03-26T07:00+08:00")] // Version 5.5
])
const capturingRadianceStartDate = new Date("2024-08-28T11:00+08:00")
const capturingRadianceHelpMap = new Map([
  ["0", ["No bonus", "text-black-600"]],
  ["1", ["No bonus", "text-black-600"]],
  ["2", ["Small chance", "text-green-600"]],
  ["3", ["Guaranteed", "text-amber-300"]],
])
const capturingRadianceHelpText = Array.from(capturingRadianceHelpMap.keys()).reduce((acc, level) => acc = (!acc ? '' : `${acc}\n`) + `${level}: ${capturingRadianceHelpMap.get(level)[0]}`, "")

const capturingRadiance = () => {
  console.log("--Starting Capturing Radiance--")
  let counter = 1
  let guarantee = 0
  const ssrPos = detail.value.ssrPos
  if (!ssrPos) return counter
  ssrPos.forEach(item => {
    const itemDate = new Date(item[2])
    if (stndBannerChars.get(item[0]) && stndBannerChars.get(item[0]) < itemDate) {
      console.log(`Lost to ${item[0]}`)
      guarantee = 1
      if (itemDate > capturingRadianceStartDate) {
        counter = counter + 1
      }
    } else {
      if (guarantee) {
        console.log(`Guaranteed ${item[0]}`)
      } else {
        console.log(`Won ${item[0]}`)
        if (itemDate > capturingRadianceStartDate) {
          if (counter > 1) {
            counter = 1
          } else {
            counter = 0
          }
        }
      }
      guarantee = 0
    }
  })
  return counter
}

const capturingRadianceCounter = computed(() => capturingRadiance().toString())
console.log(capturingRadianceCounter)

const avg5 = (list) => {
  let n = 0
  list.forEach(item => {
    n += item[1]
  })
  return parseInt((n / list.length) * 100) / 100
}

const percent = (num, total) => {
  return `${Math.round(num / total * 10000) / 100}%`
}

const colors = [
  '#5470c6', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#2ab7ca',
  '#005b96', '#ff8b94', '#72a007','#b60d1b', '#16570d'
]

const colorList = computed(() => {
  let colorsTemp = [...colors]
  const result = []
  const map = new Map()
  props.data[1].ssrPos.forEach(item => {
    if (map.has(item[0])) {
      return result.push(map.get(item[0]))
    }
    const num = Math.abs(hashCode(`${Math.floor(Date.now() / (1000 * 60 * 10))}-${item[0]}`))
    if (!colorsTemp.length) colorsTemp = [...colors]
    const color = colorsTemp.splice(num % colorsTemp.length, 1)[0]
    map.set(item[0], color)
    result.push(color)
  })
  return result
})

function hashCode(str) {
  return Array.from(str)
    .reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
}
</script>