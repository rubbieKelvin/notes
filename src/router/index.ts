import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "",
      name: "Notes",
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/@:username/note-:identifier",
      name: "Note",
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/shared",
      name: "Shared",
      components: {
        default: () => import("@/views/shared.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/archived",
      name: "Archive",
      components: {
        default: () => import("@/views/archives.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/trash",
      name: "Trash",
      components: {
        default: () => import("@/views/trash.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/starred",
      name: "Starred",
      components: {
        default: () => import("@/views/starred.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/tags",
      name: "Tags",
      components: {
        default: () => import("@/views/tags.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/search",
      name: "Search",
      components: {
        default: () => import("@/views/search.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
  ],
});
