<template>
  <div class="bg-white py-4 px-6 w-screen h-screen fixed inset-0">
    <div class="flex content-center items-center mb-4 justify-between">
      <h3 class="text-lg">设置</h3>
      <el-button icon="el-icon-close" @click="closeSetting" plain circle type="primary" size="small" class="focus:outline-none"></el-button>
    </div>
    <el-form ref="form" :model="settingForm" label-width="120px" size="mini">
      <el-form-item label="语言">
        <el-select @change="saveSetting" v-model="settingForm.lang">
          <el-option v-for="item of data.langMap" :key="item[0]" :label="item[1]" :value="item[0]"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="日志类型">
        <el-radio-group @change="saveSetting" v-model.number="settingForm.logType">
          <el-radio-button :label="0">自动</el-radio-button>
          <el-radio-button :label="1">国服</el-radio-button>
          <el-radio-button :label="2">外服</el-radio-button>
        </el-radio-group>
        <p class="text-gray-400 text-xs mt-1.5">使用游戏日志获取URL时，优先选择哪种服务器生成的日志文件。</p>
      </el-form-item>
      <el-form-item label="自动更新">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.autoUpdate">
        </el-switch>
      </el-form-item>
      <el-form-item label="代理模式">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.proxyMode">
        </el-switch>
        <p class="text-gray-400 text-xs my-1.5">通过设置系统代理来获取URL，打开后会在从日志中获取URL失败时启动。</p>
        <el-button size="small" class="focus:outline-none" @click="disableProxy">关闭系统代理</el-button>
        <p class="text-gray-400 text-xs mt-1.5">如果使用过代理模式时工具非正常关闭，可能导致系统代理设置没能清除，可以通过这个按钮来清除设置过的系统代理。</p>
      </el-form-item>
    </el-form>
    <h3 class="text-lg my-4">关于</h3>
    <p class="text-gray-600 text-xs mt-1">本工具为开源软件，源代码使用 MIT 协议授权</p>
    <p class="text-gray-600 text-xs mt-1">Github: <a @click="openGithub" class="cursor-pointer text-blue-400">https://github.com/biuuu/genshin-gacha-export</a></p>
  </div>
</template>

<script setup="props, { emit }">
const { ipcRenderer, shell } = require('electron')
import { reactive, onMounted, defineEmit } from 'vue'

const data = reactive({
  langMap: new Map()
})

const settingForm = reactive({
  lang: 'zh-cn',
  logType: 1,
  proxyMode: true,
  autoUpdate: true
})

const saveSetting = async () => {
  const keys = ['lang', 'logType', 'proxyMode', 'autoUpdate']
  for (let key of keys) {
    await ipcRenderer.invoke('SAVE_CONFIG', [key, settingForm[key]])
  }
}

const emit = defineEmit(['close'])

const closeSetting = () => emit('close')

const disableProxy = async () => {
  await ipcRenderer.invoke('DISABLE_PROXY')
}

const openGithub = () => shell.openExternal('https://github.com/biuuu/genshin-gacha-export')

onMounted(async () => {
  data.langMap = await ipcRenderer.invoke('LANG_MAP')
  const config = await ipcRenderer.invoke('GET_CONFIG')
  Object.assign(settingForm, config)
})

</script>