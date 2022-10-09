import { createApp, Ref, ref } from "vue";
import App from "./App.vue";

import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/editor.scss";

import router from "./router";
import provider from "./provider";

const app = createApp(App);

// plugins
provider(app);
app.use(router);
app.mount("#app");
