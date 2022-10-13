import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "",
      name: "Notes",
      component: () => import("./notes.vue"),
    },
    {
      path: "/@:username/:title",
      name: "Note",
      component: () => import("./notes.vue"),
    },
  ],
});
