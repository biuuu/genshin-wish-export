<template>
  <div class="bg-white py-4 px-6 w-screen h-screen absolute inset-0">
    <h3 class="text-lg mb-4">设置</h3>
    <el-form ref="form" :model="settingForm" label-width="120px" size="mini">
      <el-form-item label="语言">
        <el-select @change="saveSetting" v-model="settingForm.lang">
          <el-option v-for="item of data.langMap" :key="item[0]" :label="item[1]" :value="item[0]"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="日志类型">
        <el-radio-group @change="saveSetting" v-model.number="settingForm.logType">
          <el-radio-button :label="1">国服</el-radio-button>
          <el-radio-button :label="2">外服</el-radio-button>
        </el-radio-group>
        <p class="text-gray-400 text-xs mt-1.5">使用游戏日志获取URL时，优先选择哪种服务器生成的日志文件。</p>
      </el-form-item>
      <el-form-item label="代理模式">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.proxyMode"
          active-text="启用"
          inactive-text="关闭">
        </el-switch>
        <p class="text-gray-400 text-xs mt-1.5">通过设置系统代理来获取URL，当使用日志获取URL失败时生效。</p>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
const { ipcRenderer } = require('electron')
import { reactive, onMounted } from 'vue'

const data = reactive({
  langMap: new Map()
})

const settingForm = reactive({
  lang: 'zh-cn',
  logType: 1,
  proxyMode: true
})

const saveSetting = async () => {
  const keys = ['lang', 'logType', 'proxyMode']
  for (let key of keys) {
    await ipcRenderer.invoke('SAVE_CONFIG', [key, settingForm[key]])
  }
}

onMounted(async () => {
  data.langMap = await ipcRenderer.invoke('LANG_MAP')
  const config = await ipcRenderer.invoke('GET_CONFIG')
  Object.assign(settingForm, config)
})

</script>