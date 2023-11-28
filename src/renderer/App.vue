<template>
  <div v-if="ui" class="relative">
    <div class="flex justify-between">
      <div>
        <el-button type="primary" :icon="state.status === 'init' ? 'milk-tea': 'refresh-right'" class="focus:outline-none" :disabled="!allowClick()" plain @click="fetchData()" :loading="state.status === 'loading'">{{state.status === 'init' ? ui.button.load: ui.button.update}}</el-button>
        <el-button icon="folder-opened" @click="saveExcel" class="focus:outline-none" :disabled="!gachaData"  type="success" plain>{{ui.button.excel}}</el-button>
        <el-tooltip v-if="detail && state.status !== 'loading'" :content="ui.hint.newAccount" placement="bottom">
          <el-button @click="newUser()" plain icon="plus"  class="focus:outline-none"></el-button>
        </el-tooltip>
        <el-tooltip v-if="state.status === 'updated'" :content="ui.hint.relaunchHint" placement="bottom">
          <el-button @click="relaunch()" type="success" icon="refresh"   class="focus:outline-none" style="margin-left: 48px">{{ui.button.directUpdate}}</el-button>
        </el-tooltip>
      </div>
      <div class="flex gap-2">
        <el-select v-if="state.status !== 'loading' && state.dataMap && (state.dataMap.size > 1 || (state.dataMap.size === 1 && state.current === 0))" class="w-44"   @change="changeCurrent" v-model="uidSelectText">
          <el-option
            v-for="item of state.dataMap"
            :key="item[0]"
            :label="maskUid(item[0])"
            :value="item[0]">
          </el-option>
        </el-select>
        <el-dropdown @command="optionCommand"  >
          <el-button @click="showSetting(true)" class="focus:outline-none" plain type="info" icon="more"  >{{ui.button.option}}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="setting" icon="setting">{{ui.button.setting}}</el-dropdown-item>
              <el-dropdown-item :disabled="!allowClick() || state.status === 'loading'" command="url" icon="link">{{ui.button.url}}</el-dropdown-item>
              <el-dropdown-item :disabled="!allowClick() || state.status === 'loading'" command="proxy" icon="position">{{ui.button.startProxy}}</el-dropdown-item>
              <el-dropdown-item command="copyUrl" icon="DocumentCopy">{{ui.button.copyUrl}}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <p class="text-gray-400 my-2 text-xs">{{hint}}<el-button @click="(state.showCacheCleanDlg=true)" v-if="state.authkeyTimeout" style="margin-left: 8px;" size="small" plain round>{{ui.button.solution}}</el-button></p>
    <div v-if="detail" class="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
      <div class="mb-4" v-for="(item, i) of detail" :key="i">
        <div :class="{hidden: state.config.hideNovice && item[0] === '100'}">
          <p class="text-center text-gray-600 my-2">{{typeMap.get(item[0])}}</p>
          <pie-chart :data="item" :i18n="state.i18n" :typeMap="typeMap"></pie-chart>
          <gacha-detail :i18n="state.i18n" :data="item" :typeMap="typeMap"></gacha-detail>
        </div>
      </div>
    </div>
    <Setting v-show="state.showSetting" :i18n="state.i18n" @changeLang="getI18nData()" @close="showSetting(false)"></Setting>

    <el-dialog :title="ui.urlDialog.title" v-model="state.showUrlDlg" width="90%" custom-class="max-w-md">
      <p class="mb-4 text-gray-500">{{ui.urlDialog.hint}}</p>
      <el-input  type="textarea" :autosize="{minRows: 4, maxRows: 6}" :placeholder="ui.urlDialog.placeholder" v-model="state.urlInput" spellcheck="false"></el-input>
      <template #footer>
        <span class="dialog-footer">
          <el-button  @click="state.showUrlDlg = false" class="focus:outline-none">{{ui.common.cancel}}</el-button>
          <el-button  type="primary" @click="state.showUrlDlg = false, fetchData(state.urlInput)" class="focus:outline-none">{{ui.common.ok}}</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog :title="ui.button.solution" v-model="state.showCacheCleanDlg" width="90%" custom-class="max-w-md">
      <el-button plain icon="folder" type="primary" @click="openCacheFolder">{{ui.button.cacheFolder}}</el-button>
      <p class="my-4 leading-2 text-gray-600 text-sm whitespace-pre-line">{{ui.extra.cacheClean}}</p>
      <p class="my-2 text-gray-400 text-xs">{{ui.extra.findCacheFolder}}</p>
      <template #footer>
        <div class="dialog-footer text-center">
          <el-button  type="primary" @click="state.showCacheCleanDlg = false" class="focus:outline-none">{{ui.common.ok}}</el-button>
        </div>
      </template>
    </el-dialog>

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
import { ElMessage } from 'element-plus'

const state = reactive({
  status: 'init',
  log: '',
  data: null,
  dataMap: new Map(),
  current: 0,
  showSetting: false,
  i18n: null,
  showUrlDlg: false,
  showCacheCleanDlg: false,
  urlInput: '',
  authkeyTimeout: false,
  config: {}
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

const fetchData = async (url) => {
  state.status = 'loading'
  const data = await ipcRenderer.invoke('FETCH_DATA', url)
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

const openCacheFolder = async () => {
  await ipcRenderer.invoke('OPEN_CACHE_FOLDER')
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

const relaunch = async () => {
  await ipcRenderer.invoke('RELAUNCH')
}

const maskUid = (uid) => {
  // return `${uid}`.replace(/(.{3})(.+)(.{3})$/, '$1***$3')
  return uid
}

const showSetting = (show) => {
  if (show) {
    state.showSetting = true
  } else {
    state.showSetting = false
    updateConfig()
  }
}

const optionCommand = (type) => {
  if (type === 'setting') {
    showSetting(true)
  } else if (type === 'url') {
    state.urlInput = ''
    state.showUrlDlg = true
  } else if (type === 'proxy') {
    fetchData('proxy')
  } else if (type === 'copyUrl') {
    copyUrl()
  }
}

const copyUrl = async () => {
  const successed = await ipcRenderer.invoke('COPY_URL')
  if (successed) {
    ElMessage.success(ui.value.extra.urlCopied)
  } else {
    ElMessage.error(state.i18n.log.url.notFound)
  }
}

const setTitle = () => {
  document.title = `${state.i18n.ui.win.title} - v${version}`
}

const updateConfig = async () => {
  state.config = await ipcRenderer.invoke('GET_CONFIG')
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

  ipcRenderer.on('AUTHKEY_TIMEOUT', (event, message) => {
    state.authkeyTimeout = message
  })

  await updateConfig()
})
</script>
