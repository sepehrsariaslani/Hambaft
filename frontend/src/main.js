import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from '@/stores/auth'
import './styles/tokens.css'
import './styles/base.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize Frappe session on startup before mounting
const auth = useAuthStore()
auth.init().then(() => {
  app.mount('#app')
})
