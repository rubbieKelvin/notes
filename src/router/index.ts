import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      component: () => import("@/views/notes.vue"),
      path: "",
    },
  ],
});
