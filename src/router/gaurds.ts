import { Router } from "vue-router";
import { useAuthStore } from "@/stores/auth";

export const injectGaurds = (router: Router) => {
  router.beforeEach((to, from) => {
    const authstore = useAuthStore();
    if (!authstore.isLazilyAuthenticated && to.meta.public !== true) {
      return { name: "SignIn" };
    }
  });
};
