import { createApp, Ref, ref } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/editor.scss";

import router from "./router";
import context from "./plugins/context";
import shortcuts from "./plugins/shortcuts";

const app = createApp(App);

// plugins
app.use(router);
app.use(context);
app.use(shortcuts);
app.mount("#app");
