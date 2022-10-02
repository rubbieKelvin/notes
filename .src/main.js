import { createApp } from 'vue'
import App from './App.vue'

import './styles/fonts.css'
import './styles/index.css'
import './styles/editor-styles.scss'

import router from './router'
import store from './store'

const app = createApp(App)

// plugins
app.use(router)
app.use(store)

app.mount('#app')