import { createApp, Ref, ref } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/editor.scss";

import router from "./router";
import { ToastData } from "./types";

const app = createApp(App);
const toasts: Ref<ToastData[]> = ref([]);

// plugins
app.use(router);
app.provide("toasts", toasts);
app.mount("#app");
