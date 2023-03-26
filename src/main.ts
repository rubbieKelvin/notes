import { createApp } from "vue";
import App from "./App.vue";

import "./styles/theme.css";
import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/main.scss";
import "./styles/editor.scss";

import router from "./router";
import { createPinia } from "pinia";
import { injectGaurds } from "./router/gaurds";

const app = createApp(App);
const pinia = createPinia();

app.config.unwrapInjectedRef = true;

// plugins
app.use(pinia);
app.use(router);

injectGaurds(router);

app.mount("#app");
