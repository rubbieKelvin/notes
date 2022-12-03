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
      path: "/@:username/:identifier",
      name: "Note",
      component: () => import("./notes.vue"),
    },
    // {
    //   path: "/kc",
    //   component: () => 
    // }
  ],
});
