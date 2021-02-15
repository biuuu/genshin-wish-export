<template>
  <p class="text-gray-500 text-xs mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(data.date[0]).toLocaleString()">{{new Date(data.date[0]).toLocaleDateString()}}</span>
    -
    <span class="mx-2" :title="new Date(data.date[1]).toLocaleString()">{{new Date(data.date[1]).toLocaleDateString()}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span class="mr-1">一共 
      <span class="text-blue-600">{{data.total}}</span> 抽
    </span>
    <span v-if="name !== '新手祈愿'">已累计<span class="mx-1 text-green-600">{{data.countMio}}</span>抽未出5星</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span :title="`角色：${data.char5.size}\n武器：${data.weapon5.size}`" class="mr-3 whitespace-pre cursor-help text-yellow-500">
      <span class="min-w-10 inline-block">5星：{{data.count5}}</span>
      [{{percent(data.count5, data.total)}}]
    </span>
    <br><span :title="`角色：${data.char4.size}\n武器：${data.weapon4.size}`" class="mr-3 whitespace-pre cursor-help text-purple-600">
      <span class="min-w-10 inline-block">4星：{{data.count4}}</span>
      [{{percent(data.count4, data.total)}}]
    </span>
    <br><span class="text-blue-500 whitespace-pre">
      <span class="min-w-10 inline-block">3星：{{data.count3}}</span>
      [{{percent(data.count3, data.total)}}]
    </span>
  </p>
  
  <p class="text-gray-600 text-xs mb-1" v-if="data.ssrPos.length">
    5星历史记录：
    <span :title="item[2]" class="cursor-help mr-1 text-yellow-500" :style="`color:${randomColor()}`" v-for="(item) of data.ssrPos" :key="item">
      {{item[0]}}[{{item[1]}}]
    </span>
  </p>
  <p v-if="data.ssrPos.length" class="text-gray-600 text-xs">5星平均出货次数为：<span class="text-green-600">{{avg5(data.ssrPos)}}</span></p>
</template>

<script setup>
import { defineProps } from 'vue'
defineProps({
  data: Object,
  name: String
})
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
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc'
]
const randomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)]
}
</script>
