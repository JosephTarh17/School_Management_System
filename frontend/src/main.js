import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { authStore } from './store/auth'
import './index.css'

authStore.restoreSession().finally(() => {
  createApp(App).use(router).mount('#app')
})
