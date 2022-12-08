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
        </el-radio-group>
        <p class="text-gray-400 text-xs m-1.5">{{text.logTypeHint}}</p>
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
      <el-form-item :label="text.proxyMode">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.proxyMode">
        </el-switch>
        <p class="text-gray-400 text-xs m-1.5">{{text.proxyModeHint}}</p>
        <el-button class="focus:outline-none" @click="disableProxy">{{text.closeProxy}}</el-button>
        <p class="text-gray-400 text-xs m-1.5">{{text.closeProxyHint}}</p>
      </el-form-item>
      <el-form-item v-if="settingForm.lang === 'zh-cn'" label="导出到其它工具">
        <el-button @click="exportUIGFJSON" type="success" plain class="focus:outline-none">导出JSON</el-button>
        <p class="text-gray-400 text-xs m-1.5 leading-normal">该功能用于导出数据到其它抽卡记录管理工具，仅支持简体中文模式。<br>支持的工具参考这个链接：
          <a class="cursor-pointer text-blue-400" @click="openLink('https://github.com/DGP-Studio/Snap.Genshin/wiki/StandardFormat#export_app')">统一可交换祈愿记录标准</a>
        </p>
      </el-form-item>
    </el-form>
    <h3 class="text-lg my-4">{{about.title}}</h3>
    <p class="text-gray-600 text-xs mt-1">{{about.license}}</p>
    <p class="text-gray-600 text-xs mt-1 pb-6">Github: <a @click="openGithub" class="cursor-pointer text-blue-400">https://github.com/biuuu/genshin-wish-export</a></p>
  </div>
</template>

<script setup>
const { ipcRenderer, shell } = require('electron')
import { reactive, onMounted, computed } from 'vue'

const emit = defineEmits(['close', 'changeLang'])

const props = defineProps({
  i18n: Object
})

const data = reactive({
  langMap: new Map()
})

const settingForm = reactive({
  lang: 'zh-cn',
  logType: 1,
  proxyMode: true,
  autoUpdate: true,
  fetchFullHistory: false,
  hideNovice: true
})

const text = computed(() => props.i18n.ui.setting)
const about = computed(() => props.i18n.ui.about)

const saveSetting = async () => {
  const keys = ['lang', 'logType', 'proxyMode', 'autoUpdate', 'fetchFullHistory', 'hideNovice']
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

const exportUIGFJSON = () => {
  ipcRenderer.invoke('EXPORT_UIGF_JSON')
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