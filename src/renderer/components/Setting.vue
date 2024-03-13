<template>
  <div class="bg-white pt-2 pb-4 px-6 w-full h-full absolute inset-0">
    <div class="flex content-center items-center mb-4 justify-between">
      <h3 class="text-lg">{{text.title}}</h3>
      <el-button icon="close" @click="closeSetting" plain circle type="default" class="w-8 h-8 relative -right-4 -top-2 shadow-md focus:shadow-none focus:outline-none"></el-button>
    </div>
    <el-form :model="settingForm" label-width="120px">
      <el-form-item :label="text.language">
        <el-select @change="saveLang" v-model="settingForm.lang">
          <el-option v-for="item of data.langMap" :key="item[0]" :label="item[1]" :value="item[0]"></el-option>
        </el-select>
        <p class="text-gray-400 text-xs m-1.5">{{text.languageHint}}</p>
      </el-form-item>
      <el-form-item :label="text.logType">
        <el-radio-group @change="saveSetting" v-model.number="settingForm.logType">
          <el-radio-button :label="0">{{text.auto}}</el-radio-button>
          <el-radio-button :label="1">{{text.cnServer}}</el-radio-button>
          <el-radio-button :label="2">{{text.seaServer}}</el-radio-button>
          <el-radio-button v-if="settingForm.lang === 'zh-cn'" :label="3">云原神</el-radio-button>
        </el-radio-group>
        <p class="text-gray-400 text-xs m-1.5">{{text.logTypeHint}}</p>
      </el-form-item>
      <el-form-item :label="text.UIGFLable">
        <div class="flex space-x-2">
          <el-button :loading="data.loadingOfUIGFJSON" class="focus:outline-none" plain type="primary" @click="importUIGFJSON">{{ text.UIGFImportButton }}</el-button>
          <el-button :loading="data.loadingOfUIGFJSON" class="focus:outline-none" plain type="success" @click="exportUIGFJSON">{{ text.UIGFButton }}</el-button>
          <el-checkbox v-model="settingForm.readableJSON" @change="saveSetting">{{ text.UIGFReadable }}</el-checkbox>
        </div>
        <p class="text-gray-400 text-xs m-1.5 leading-normal">{{ text.UIGFHint }}
          <a class="cursor-pointer text-blue-400"
             @click="openLink(`https://uigf.org/${settingForm.lang.startsWith('zh-') ? 'zh/': 'en/'}`)">{{ text.UIGFLink }}</a>
        </p>
      </el-form-item>
      <el-form-item :label="text.autoUpdate">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.autoUpdate">
        </el-switch>
      </el-form-item>
      <el-form-item :label="text.hideNovice">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.hideNovice">
        </el-switch>
      </el-form-item>
      <el-form-item :label="text.fetchFullHistory">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.fetchFullHistory">
        </el-switch>
        <p class="text-gray-400 text-xs m-1.5">{{text.fetchFullHistoryHint}}</p>
      </el-form-item>
    </el-form>
    <h3 class="text-lg my-4">{{about.title}}</h3>
    <p class="text-gray-600 text-xs mt-1">{{about.license}}</p>
    <p class="text-gray-600 text-xs mt-1 pb-6">Github: <a @click="openGithub" class="cursor-pointer text-blue-400">https://github.com/biuuu/genshin-wish-export</a></p>
  </div>
</template>

<script setup>
const { ipcRenderer, shell } = require('electron')
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['close', 'changeLang', 'dataUpdated'])

const props = defineProps({
  i18n: Object
})

const data = reactive({
  langMap: new Map(),
  loadingOfUIGFJSON: false
})

const settingForm = reactive({
  lang: 'zh-cn',
  logType: 1,
  proxyMode: true,
  autoUpdate: true,
  fetchFullHistory: false,
  hideNovice: true,
  gistsToken: '',
  readableJSON: false
})

const text = computed(() => props.i18n.ui.setting)
const about = computed(() => props.i18n.ui.about)

const saveSetting = async () => {
  const keys = ['lang', 'logType', 'proxyMode', 'autoUpdate', 'fetchFullHistory', 'hideNovice', 'gistsToken', 'readableJSON']
  for (let key of keys) {
    await ipcRenderer.invoke('SAVE_CONFIG', [key, settingForm[key]])
  }
}

const saveLang = async () => {
  await saveSetting()
  emit('changeLang')
}

const closeSetting = () => emit('close')

const disableProxy = async () => {
  await ipcRenderer.invoke('DISABLE_PROXY')
}

const openGithub = () => shell.openExternal('https://github.com/biuuu/genshin-wish-export')
const openLink = (link) => shell.openExternal(link)

const exportUIGFJSON = async () => {
  data.loadingOfUIGFJSON = true
  try {
    await ipcRenderer.invoke('EXPORT_UIGF_JSON')
  } catch (e) {
    ElMessage({
      message: e.message || e,
      type: 'error'
    })
  } finally {
    data.loadingOfUIGFJSON = false
  }
}

const importUIGFJSON = async () => {
  data.loadingOfUIGFJSON = true
  try {
    const result = await ipcRenderer.invoke('IMPORT_UIGF_JSON')
    if (result === 'canceled') {
      return
    }
    emit('dataUpdated')
    closeSetting()
    ElMessage({
      message: text.value.UIGFImportSuccessed,
      type: 'success'
    })
  } catch (e) {
    ElMessage({
      message: e.message || e,
      type: 'error'
    })
  } finally {
    data.loadingOfUIGFJSON = false
  }
}

const gistsConfigDisabled = ref(true)

const configGistsToken = () => {
  gistsConfigDisabled.value = false
  openLink('https://github.com/settings/personal-access-tokens/new')
}

const saveGistsToken = async () => {
  gistsConfigDisabled.value = true
  await saveSetting()
}

const uploadGistsLoading = ref(false)
const uploadGists = async () => {
  uploadGistsLoading.value = true
  const result = await ipcRenderer.invoke('EXPORT_UIGF_JSON_GISTS')
  if (result === 'successed') {
    ElMessage({
      message: '上传数据成功',
      type: 'success',
    })
  } else {
    ElMessage({
      message: result,
      type: 'error',
    })
  }
  uploadGistsLoading.value = false
}

onMounted(async () => {
  data.langMap = await ipcRenderer.invoke('LANG_MAP')
  const config = await ipcRenderer.invoke('GET_CONFIG')
  Object.assign(settingForm, config)
})

</script>

<style>
.el-form-item__label {
  line-height: normal !important;
  position: relative;
  top: 6px;
}
.el-form-item__content {
  flex-direction: column;
  align-items: start !important;
}
.el-form-item--default {
  margin-bottom: 14px !important;
}
</style>
