import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: import("../views/index.vue"), children: [
        {
          path: '',
          component: import('../views/Note/empty.vue')
        },
        {
            path: '/:note_id',
            component: import("../views/Note/index.vue"),
            props: true,
        },
        {
            path: '/:node_id/edit',
            component: import("../views/Note/edit.vue"),
            props: true
        }
    ] },
  ],
});
