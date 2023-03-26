<template>
  <div paw class="h-full">
    <slot />
  </div>
</template>

<script lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/stores/toasts";
import { promiseTimeout } from "@vueuse/core";
import { defineComponent, onMounted } from "vue";
import { useRouter } from "vue-router";
import { setupUserData } from "@/router/hooks";

export default defineComponent({
  setup() {
    const authstore = useAuthStore();
    const toast = useToast();
    const toastId = Symbol();
    const router = useRouter();

    const doAuth = async () => {
      await authstore.authenticate(
        (retiesIn) => {
          toast.updateToast(toastId, {
            title: "Error",
            desciption:
              retiesIn === null
                ? "Couldnt reach sever"
                : `Error reaching server, retrying in ${
                    retiesIn / 1000
                  } seconds`,
          });
        },
        async () => {
          toast.updateToast(toastId, {
            title: "Retrying",
            desciption: "Authenticating current user",
          });
        }
      );
      if (authstore.isAuthenticated) {
        await setupUserData();
      } else {
        throw new Error("no user");
      }
    };

    onMounted(async () => {
      await toast.promise(toastId, {
        action: doAuth,
        title: {
          loading: "Authenticating",
          error: "Error",
          success: "Authenticated",
        },
        messages: () => ({
          loading: "Looking up current user",
          success: `Logged in as ${authstore.user?.username}`,
          error: "Couldnt get user",
        }),
        onError: (e) => {
          router.push({ name: "SignIn", params: { fromError: 1 } });
          throw e;
        },
      });
    });
  },
});
</script>
