<template>
  <div ref="chart" class="mx-auto h-56 w-64 mb-2"></div>
</template>

<script setup>
import { defineProps, reactive, ref, onMounted } from 'vue'
import * as echarts from '../../module/echarts.esm.min.js'

const props = defineProps({
  data: Object
})

const chart = ref(null)

const keys = [
  ['5星角色', 'char5'],
  ['5星武器', 'weapon5'],
  ['4星角色', 'char4'],
  ['4星武器', 'weapon4'],
  ['3星武器', 'weapon3']
]

const colors = [
  '#fac858',
  '#ee6666',
  '#5470c6',
  '#91cc75',
  '#73c0de'
]

const parseData = (data) => {
  const result = []
  const color = []
  keys.forEach((key, index) => {
    if (!data[key[1]].size) return
    result.push({
      value: data[key[1]].size,
      name: key[0]
    })
    color.push(colors[index])
  })
  return [result, color]
}

const result = parseData(props.data[1])

onMounted(() => {
  const myChart = echarts.init(chart.value)
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a0}<br>{b0}: {c0} ({d0}%)',
      padding: 4,
      textStyle: {
        fontSize: 12
      }
    },
    legend: {
      top: '2%',
      left: 'center'
    },
    selectedMode: 'single',
    color: result[1],
    series: [
      {
        name: props.data[0],
        type: 'pie',
        top: '20%',
        radius: ['0%', '68%'],
        avoidLabelOverlap: false,
        labelLine: {
          length: 0
        },
        data: result[0]
      }
    ]
  }

  myChart.setOption(option)
})

const state = reactive({ count: 0 })
</script>