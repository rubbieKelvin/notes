import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "CoreLayout",
      component: () => import("./layouts/core.vue"),
      children: [
        {
          path: "",
          name: "Notes",
          components: {
            default: () => import("@/views/notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
        {
          path: "/notes/:identifier",
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
          path: "/shared/:identifier",
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
            default: () => import("@/views/old.notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
        {
          path: "/archived/:identifier",
          name: "ArchivedNote",
          props: { default: { section: "ArchivedNote" } },
          components: {
            default: () => import("@/views/old.notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
        {
          path: "/trash",
          name: "Trash",
          props: { default: { section: "Trash" } },
          components: {
            default: () => import("@/views/old.notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
        {
          path: "/starred",
          name: "Starred",
          props: { default: { section: "StarredNote" } },
          components: {
            default: () => import("@/views/old.notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
        {
          path: "/starred/:identifier",
          name: "StarredNote",
          props: { default: { section: "StarredNote" } },
          components: {
            default: () => import("@/views/old.notes.vue"),
            extended: () => import("@/views/editor.vue"),
          },
        },
      ],
    },
    {
      path: "/public",
      name: "PublicHome",
      component: () => import("@/views/public/index.vue"),
      meta: { public: true },
    },
    {
      path: "/public/:username/:identifier",
      name: "PublicNote",
      component: () => import("@/views/public/user/note/index.vue"),
      meta: { public: true },
    },
    {
      path: "/signin",
      component: () => import("@/views/account/index.vue"),
      props: { type: "signin" },
      name: "SignIn",
      meta: { public: true },
    },
    {
      path: "/signup",
      name: "SignUp",
      props: { type: "signup" },
      component: () => import("@/views/account/index.vue"),
      meta: { public: true },
    },
  ],
});

export default router;
