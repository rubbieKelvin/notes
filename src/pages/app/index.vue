<template>
  <div class="index">
    <sidebar />
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Sidebar from "@/layouts/Sidebar.vue";
import useAccountStore from '@/store/useAccountStore';

export default defineComponent({
  components: { Sidebar },
  beforeRouteEnter(to: any, from: any, next: any) {
    console.log("working...");
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
});
</script>

<style lang="scss" scoped>
.index {
  @apply flex;
}
</style>
