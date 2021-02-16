<template>
  <div class="chart mb-2 relative h-48 lg:h-56 xl:h-64 2xl:h-72">
    <div ref="chart" class="absolute inset-0"></div>
  </div>
</template>

<script setup>
import { defineProps, reactive, computed, ref, onMounted } from 'vue'
import * as echarts from '../../module/echarts.esm.min.js'
import throttle from 'lodash-es/throttle'

const props = defineProps({
  data: Object,
  typeMap: Map
})

const chart = ref(null)

const keys = [
  ['5星角色', 'count5c'],
  ['5星武器', 'count5w'],
  ['4星角色', 'count4c'],
  ['4星武器', 'count4w'],
  ['3星武器', 'count3w']
]

const colors = [
  '#fac858',
  '#ee6666',
  '#5470c6',
  '#91cc75',
  '#73c0de'
]

const parseData = (detail, type) => {
  const result = []
  const color = []
  const selected = {
    '3星武器': false
  }
  keys.forEach((key, index) => {
    if (!detail[key[1]]) return
    result.push({
      value: detail[key[1]],
      name: key[0]
    })
    color.push(colors[index])
  })
  if (type === '100' || result.findIndex(item => item.name.includes('5')) === -1) {
    selected['3星武器'] = true
  }
  return [result, color, selected]
}

const result = parseData(props.data[1], props.data[0])

let pieChart = null
const updateChart = throttle(() => {
  if (!pieChart) {
    pieChart = echarts.init(chart.value)
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a0}<br>{b0}: {c0}',
      padding: 4,
      textStyle: {
        fontSize: 12
      }
    },
    legend: {
      top: '2%',
      left: 'center',
      selected: result[2],
    },
    selectedMode: 'single',
    color: result[1],
    series: [
      {
        name: props.typeMap.get(props.data[0]),
        type: 'pie',
        top: 50,
        radius: ['0%', '90%'],
        avoidLabelOverlap: false,
        labelLine: {
          length: 0
        },
        data: result[0]
      }
    ]
  }

  pieChart.setOption(option)
  pieChart.resize()
}, 1000)

onMounted(() => {
  updateChart()
})

window.addEventListener('resize', updateChart)
</script>