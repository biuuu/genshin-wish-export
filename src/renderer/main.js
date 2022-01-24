import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { IconInstaller } from './utils'

const app = createApp(App)
app.use(ElementPlus)
IconInstaller(app)
app.mount('#app')
