<template>
  <div v-if="ui">
    <div class="flex justify-between">
      <div>
        <el-button type="primary" :icon="state.status === 'init' ? 'el-icon-milk-tea': 'el-icon-refresh-right'" class="focus:outline-none" :disabled="!allowClick()" plain size="small" @click="fetchData" :loading="state.status === 'loading'">{{state.status === 'init' ? ui.button.load: ui.button.update}}</el-button>
        <el-button icon="el-icon-folder-opened" @click="saveExcel" class="focus:outline-none" :disabled="!gachaData" size="small" type="success" plain>{{ui.button.excel}}</el-button>
        <el-tooltip v-if="detail && state.status !== 'loading'" :content="ui.hint.newAccount" placement="bottom">
          <el-button @click="newUser()" plain icon="el-icon-plus" size="small" class="focus:outline-none"></el-button>
        </el-tooltip>
      </div>
      <div class="flex gap-2">
        <el-select v-if="state.status !== 'loading' && state.dataMap && (state.dataMap.size > 1 || (state.dataMap.size === 1 && state.current === 0))" class="w-32" size="small" @change="changeCurrent" v-model="uidSelectText">
          <el-option
            v-for="item of state.dataMap"
            :key="item[0]"
            :label="maskUid(item[0])"
            :value="item[0]">
          </el-option>
        </el-select>
        <el-button @click="showSetting(true)" class="focus:outline-none" plain type="info" icon="el-icon-setting" size="small">{{ui.button.setting}}</el-button>
      </div>
    </div>
    <p class="text-gray-400 my-2 text-xs">{{hint}}</p>
    <div v-if="detail" class="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
      <div class="mb-4" v-for="(item, i) of detail" :key="i">
        <p class="text-center text-gray-600 my-2">{{typeMap.get(item[0])}}</p>
        <pie-chart :data="item" :i18n="state.i18n" :typeMap="typeMap"></pie-chart>
        <gacha-detail :i18n="state.i18n" :data="item" :typeMap="typeMap"></gacha-detail>
      </div>
    </div>
    <Setting v-show="state.showSetting" :i18n="state.i18n" @changeLang="getI18nData()" @close="showSetting(false)"></Setting>
  </div>
</template>

<script setup>
const { ipcRenderer } = require('electron')
import { reactive, computed, watch, onMounted } from 'vue'
import PieChart from './components/PieChart.vue'
import GachaDetail from './components/GachaDetail.vue'
import Setting from './components/Setting.vue'
import gachaDetail from './gachaDetail'
import { version } from '../../package.json'

const state = reactive({
  status: 'init',
  log: '',
  data: null,
  dataMap: new Map(),
  current: 0,
  showSetting: false,
  i18n: null
})

const ui = computed(() => {
  if (state.i18n) {
    return state.i18n.ui
  }
})

const gachaData = computed(() => {
  return state.dataMap.get(state.current)
})

const uidSelectText = computed(() => {
  if (state.current === 0) {
    return state.i18n.ui.select.newAccount
  } else {
    return state.current
  }
})

const allowClick = () => {
  const data = state.dataMap.get(state.current)
  if (!data) return true
  if (Date.now() - data.time < 1000 * 60) {
    return false
  }
  return true
}

const hint = computed(() => {
  const data = state.dataMap.get(state.current)
  if (!state.i18n) {
    return 'Loading...'
  }
  const { hint } = state.i18n.ui
  const { colon } = state.i18n.symbol
  if (state.status === 'init') {
    return hint.init
  } else if (state.status === 'loaded') {
    return `${hint.lastUpdate}${colon}${new Date(data.time).toLocaleString()}`
  } else if (state.status === 'loading') {
    return state.log || 'Loading...'
  } else if (state.status === 'updated') {
    return state.log
  } else if (state.status === 'failed') {
    return state.log + ` - ${hint.failed}`
  }
  return '　'
})

const detail = computed(() => {
  const data = state.dataMap.get(state.current)
  if (data) {
    return gachaDetail(data.result)
  }
})

const typeMap = computed(() => {
  const data = state.dataMap.get(state.current)
  return data.typeMap
})

const fetchData = async () => {
  state.status = 'loading'
  const data = await ipcRenderer.invoke('FETCH_DATA')
  if (data) {
    state.dataMap = data.dataMap
    state.current = data.current
    state.status = 'loaded'
  } else {
    state.status = 'failed'
  }
}

const readData = async () => {
  const data = await ipcRenderer.invoke('READ_DATA')
  if (data) {
    state.dataMap = data.dataMap
    state.current = data.current
    if (data.dataMap.get(data.current)) {
      state.status = 'loaded'
    }
  }
}

const getI18nData = async () => {
  const data = await ipcRenderer.invoke('I18N_DATA')
  if (data) {
    state.i18n = data
    setTitle()
  }
}

const saveExcel = async () => {
  await ipcRenderer.invoke('SAVE_EXCEL')
}

const changeCurrent = async (uid) => {
  if (uid === 0) {
    state.status = 'init'
  } else {
    state.status = 'loaded'
  }
  state.current = uid
  await ipcRenderer.invoke('CHANGE_UID', uid)
}

const newUser = async () => {
  await changeCurrent(0)
}

const maskUid = (uid) => {
  return `${uid}`.replace(/(.+)(.{3})$/, '******$2')
}

const showSetting = (show) => {
  if (show) {
    state.showSetting = true
  } else {
    state.showSetting = false
  }
}

const setTitle = () => {
  document.title = `${state.i18n.ui.win.title} - v${version}`
}

onMounted(async () => {
  await readData()
  await getI18nData()

  ipcRenderer.on('LOAD_DATA_STATUS', (event, message) => {
    state.log = message
  })

  ipcRenderer.on('ERROR', (event, err) => {
    console.error(err)
  })

  ipcRenderer.on('UPDATE_HINT', (event, message) => {
    state.log = message
    state.status = 'updated'
  })
})
</script>
