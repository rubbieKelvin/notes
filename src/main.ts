import { createApp } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/editor.scss";

import router from "./router";

const app = createApp(App);

// plugins
app.use(router);

app.mount("#app");
