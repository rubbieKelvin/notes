<template>
  <div class="index" v-if="ctx.user">
    <sidebar />
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Sidebar from "@/layouts/Sidebar.vue";
import useAccountStore from "@/store/useAccountStore";
import { onMounted, provide, ref, Ref } from "@vue/runtime-core";
import { ApplicationDataContext } from "@/constants/types";
import { get_user } from "@/packages/api";

export default defineComponent({
  components: { Sidebar },
  beforeRouteEnter(to: any, from: any, next: any) {
    const account = useAccountStore();
    console.log({ account });
    account
      .getUser()
      .then((user) => {
        if (user) return next();
        next("/login");
      })
      .catch(() => next("/login"));
  },
  setup() {
    const ctx: Ref<ApplicationDataContext> = ref({
      user: null,
      notes: [],
    });

    onMounted(async () => {
      // get user
      const user = await get_user()
      ctx.value.user = user
    });

    provide("ctx", ctx);
    return { ctx };
  },
});
</script>

<style lang="scss" scoped>
.index {
  @apply flex;
}
</style>
