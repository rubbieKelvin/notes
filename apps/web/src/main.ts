import { createApp } from 'vue'
import '@fontsource-variable/inter'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import './style.css'
import App from './App.vue'
import { installErrorReporting } from './telemetry'

const app = createApp(App)
installErrorReporting(app)
app.mount('#app')
