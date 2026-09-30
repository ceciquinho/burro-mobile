import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import App from './App.vue'
import router from './router'
import './theme.css'
import './app.css'

const app = createApp(App).use(IonicVue).use(router)

router.isReady().then(() => app.mount('#app'))
