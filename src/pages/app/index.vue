<template>
  <div class="index" v-if="ctx.user">
    <sidebar />
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Sidebar from "@/layouts/Sidebar.vue";
import { onMounted, provide } from "@vue/runtime-core";
import { get_user } from "@/packages/api";
import useApplicationContext from "@/packages/utils/useApplicationContext"

export default defineComponent({
  components: { Sidebar },
  beforeRouteEnter(to: any, from: any, next: any) {
    get_user()
      .then((user) => {
        if (user) return next();
        next("/login");
      })
      .catch(() => next("/login"));
  },
  setup() {
    const ctx = useApplicationContext()

    onMounted(async () => {
      await ctx.value.updateUser()
      await ctx.value.updateNotes()
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
