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
      path: "/notes/note-:identifier",
      name: "Note",
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/public/:username/note-:identifier",
      name: "PublicNote",
      components: { extended: () => import("@/views/editor.vue") },
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
      path: "/shared/note-:identifier",
      name: "SharedNote",
      components: {
        default: () => import("@/views/shared.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/archived",
      name: "Archive",
      props: { default: { section: "ArchivedNote" } },
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/archived/note-:identifier",
      name: "ArchivedNote",
      props: { default: { section: "ArchivedNote" } },
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/trash",
      name: "Trash",
      props: { default: { section: "Trash" } },
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/starred",
      name: "Starred",
      props: { default: { section: "StarredNote" } },
      components: {
        default: () => import("@/views/notes.vue"),
        extended: () => import("@/views/editor.vue"),
      },
    },
    {
      path: "/starred/note-:identifier",
      name: "StarredNote",
      props: { default: { section: "StarredNote" } },
      components: {
        default: () => import("@/views/notes.vue"),
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
