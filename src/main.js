import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {Edit, CopyDocument, Delete} from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'

import './assets/main.css'

const icons = { Edit, CopyDocument, Delete };
const app = createApp(App)

app.use(createPinia())
app.use(router)

// 引入ElementPlus
app.use(ElementPlus)

Object.entries(icons).forEach((comp) => {
    app.component(comp[0], comp[1]);
});
app.mount('#app')
