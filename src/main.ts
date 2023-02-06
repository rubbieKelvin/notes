import { createApp } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/main.scss";
import "./styles/editor.scss";

import router from "./router";
import { createPinia } from "pinia";

const app = createApp(App);
const pinia = createPinia();

app.config.unwrapInjectedRef = true;

// plugins
app.use(router);
app.use(pinia);
app.mount("#app");
