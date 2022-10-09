import { createApp, Ref, ref } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/editor.scss";

import router from "./router";
import { LocalData, ToastData } from "./types";

const app = createApp(App);
const toasts: Ref<ToastData[]> = ref([]);
const modelstore: Ref<LocalData[]> = ref([]);

try {
  modelstore.value = JSON.parse(
    localStorage.getItem("opennotes.local") ?? "[]"
  ) as LocalData[];
} catch {}

// plugins
app.use(router);
app.provide("toasts", toasts);
app.provide("modelstore", modelstore);
app.mount("#app");
