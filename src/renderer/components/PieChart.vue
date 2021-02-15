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

const parseData = (data, name) => {
  const result = []
  const color = []
  const selected = {
    '3星武器': false
  }
  keys.forEach((key, index) => {
    if (!data[key[1]]) return
    result.push({
      value: data[key[1]],
      name: key[0]
    })
    color.push(colors[index])
  })
  if (name === '新手祈愿') {
    selected['3星武器'] = true
  }
  return [result, color, selected]
}

const result = parseData(props.data[1], props.data[0])

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
      left: 'center',
      selected: result[2],
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