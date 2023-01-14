import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      component: () => import("@/views/notes.vue"),
      path: "",
    },
    {
      component: () => import("@/views/notes.vue"),
      path: "/notes",
    },
    {
      name: "NewNote",
      components: {
        default: () => import("@/views/notes.vue"),
        appSection: () => import("@/views/newnote.vue"),
      },
      path: "/notes/new",
    },
    {
      components: {
        default: () => import("@/views/notes.vue"),
        appSection: () => import("@/views/editor.vue"),
      },
      path: "/notes/:id",
    },
    {
      component: () => import("@/views/starred.vue"),
      path: "/starred",
    },
    {
      component: () => import("@/views/archived.vue"),
      path: "/archive",
    },
    {
      component: () => import("@/views/trash.vue"),
      path: "/trash",
    },
  ],
});
