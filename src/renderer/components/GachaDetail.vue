<template>
  <p class="text-gray-500 text-xs mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(data.date[0]).toLocaleString()">{{new Date(data.date[0]).toLocaleDateString()}}</span>
    -
    <span class="mx-2" :title="new Date(data.date[1]).toLocaleString()">{{new Date(data.date[1]).toLocaleDateString()}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1">
    <span class="mr-2">一共{{data.total}}抽 </span>
    <span :title="`角色：${data.char5.size}\n武器：${data.weapon5.size}`" class="mr-3 cursor-help text-red-500">5星：{{data.count5}} </span>
    <span :title="`角色：${data.char4.size}\n武器：${data.weapon4.size}`" class="mr-3 cursor-help text-purple-600">4星：{{data.count4}} </span>
    <span class="text-blue-500">3星：{{data.count3}}</span>
  </p>
  <p class="text-gray-600 text-xs mb-1" v-if="name !== '新手祈愿'">目前已累积<span class="mx-1 text-yellow-700">{{data.countMio}}</span>抽未出5星</p>
  <p class="text-gray-600 text-xs mb-1" v-if="data.ssrPos.length">
    5星历史记录：
    <span :title="item[2]" class="cursor-help mr-1 text-green-600" v-for="item of data.ssrPos" :key="item">
      {{item[0]}}({{item[1]}})
    </span>
  </p>
  <p v-if="data.ssrPos.length" class="text-gray-600 text-xs">5星平均出货次数为：{{avg5(data.ssrPos)}}</p>
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
</script>
