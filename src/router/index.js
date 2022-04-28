import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: import("../views/index.vue") },
    { path: "/:slug", component: import("../views/pad.vue"), props: true },
  ],
});
