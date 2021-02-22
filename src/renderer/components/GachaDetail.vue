<template>
  <p class="text-gray-500 text-xs mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(detail.date[0]).toLocaleString()">{{new Date(detail.date[0]).toLocaleDateString()}}</span>
    -
    <span class="mx-2" :title="new Date(detail.date[1]).toLocaleString()">{{new Date(detail.date[1]).toLocaleDateString()}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span class="mr-1">Total wishes:
      <span class="text-blue-600">{{detail.total}}</span>
    </span>
    <span v-if="type !== '100'">Pity Counter: <span class="mx-1 text-green-600">{{detail.countMio}}</span></span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span :title="`Character：${detail.count5c}\nWeapon：${detail.count5w}`" class="mr-3 whitespace-pre cursor-help text-yellow-500">
      <span class="min-w-10 inline-block">5 Star：{{detail.count5}}</span>
      [{{percent(detail.count5, detail.total)}}]
    </span>
    <br><span :title="`Character：${detail.count4c}\nWeapon：${detail.count4w}`" class="mr-3 whitespace-pre cursor-help text-purple-600">
      <span class="min-w-10 inline-block">4 Star：{{detail.count4}}</span>
      [{{percent(detail.count4, detail.total)}}]
    </span>
    <br><span class="text-blue-500 whitespace-pre">
      <span class="min-w-10 inline-block">3 Star：{{detail.count3}}</span>
      [{{percent(detail.count3, detail.total)}}]
    </span>
  </p>

  <p class="text-gray-600 text-xs mb-1" v-if="detail.ssrPos.length">
    5 Star Pull History：
    <span :title="item[2]" class="cursor-help mr-1" :style="`color:${colorList[index]}`"
      v-for="(item, index) of detail.ssrPos" :key="item"
    >
      {{item[0]}}[{{item[1]}}]
    </span>
  </p>
  <p v-if="detail.ssrPos.length" class="text-gray-600 text-xs">Average wishes to get a 5 star：<span class="text-green-600">{{avg5(detail.ssrPos)}}</span></p>
</template>

<script setup>
import { defineProps, computed } from 'vue'

const props = defineProps({
  data: Object,
  typeMap: Map
})

const type = computed(() => props.data[0])
const detail = computed(() => props.data[1])

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