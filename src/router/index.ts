import { createRouter, createWebHistory } from "vue-router";

const apphome = (path: string) => ({
  path,
  component: () => import("@/pages/app/notes.vue"),
  children: [
    { path: "", component: () => import("@/pages/app/emptypad.vue") },
    {
      path: ":slug",
      component: () => import("@/pages/app/pad.vue"),
      props: true,
    },
  ],
});

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("@/pages/index.vue"),
    },
    {
      path: "/signup",
      component: () => import("@/pages/signup.vue"),
    },
    {
      path: "/login",
      component: () => import("@/pages/login.vue"),
    },
    {
      path: "/app",
      component: () => import("@/pages/app/index.vue"),
      children: [
        apphome(""),
        apphome("mynotes"),
      ],
    },
  ],
});
