import { createApp } from 'vue'
import App from './App.vue'
import ContextHelp from './components/ContextHelp.vue'
import router from './router'
import { authStore } from './store/auth'
import './index.css'

authStore.restoreSession().finally(() => {
      createApp(App).component('ContextHelp', ContextHelp).use(router).mount('#app')

})
