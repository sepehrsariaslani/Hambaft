import { createApp } from 'vue'
import {
  Button,
  Input,
  TextInput,
  FormControl,
  ErrorMessage,
  setConfig,
  frappeRequest,
  resourcesPlugin,
} from 'frappe-ui'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './index.css'

const globalComponents = {
  Button,
  TextInput,
  Input,
  FormControl,
  ErrorMessage,
}

const app = createApp(App)

setConfig('resourceFetcher', frappeRequest)

app.use(resourcesPlugin)
app.use(createPinia())
app.use(router)

for (const key in globalComponents) {
  app.component(key, globalComponents[key])
}

app.config.globalProperties.$frappeRequest = frappeRequest

if (import.meta.env.DEV) {
  window.user = 'Administrator'
  window.user_full_name = 'مدیر'
  window.user_role = 'مدیر سیستم'
  window.user_roles = ['System Manager']
  app.mount('#app')

  frappeRequest({ url: '/api/method/hambaft.www.hambaft.get_context_for_dev' })
    .then((values) => {
      for (const key in values) {
        window[key] = values[key]
      }
    })
    .catch(() => {})
} else {
  app.mount('#app')
}

if (import.meta.env.DEV) {
  window.$router = router
  window.$frappeRequest = frappeRequest
}
