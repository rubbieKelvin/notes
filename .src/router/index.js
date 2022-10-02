import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../views/index.vue"),
      children: [
        { path: "/", component: () => import("../views/notes.vue") },
        { path: "/notes", component: () => import("../views/notes.vue") },
        { path: "/help", component: () => import("../views/help.vue") },
      ],
    },
    { path: "/:ld", component: () => import("../views/pad.vue"), props: true },
  ],
});
