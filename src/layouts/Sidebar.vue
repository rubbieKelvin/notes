<template>
  <div class="sidebar h-full">
    <!-- author -->
    <AccountWidget class="mx-6" />

    <!-- quicklinks -->
    <div class="block">
      <h1 class="title">Quick links</h1>
      <div class="body">
        <router-link
          class="link"
          :to="ql.link"
          v-for="ql in QUICK_LINKS"
          :key="ql.name"
        >
          <Icons :name="ql.icon" />
          <span>{{ ql.name }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  @apply flex flex-col w-[300px] gap-12 py-8 select-none border-r;
  @apply border-r-wall bg-gray-50;

  .block {
    @apply px-6 flex gap-3 flex-col;

    .title {
      @apply font-medium text-lg text-gray-700;
    }

    .body {
      @apply flex flex-col gap-2;

      .link {
        @apply flex rounded-md p-2 items-center gap-3 text-gray-800;
        @apply hover:bg-primary-basic hover:text-white;
        @apply transition-all duration-200;
      }
    }
  }
}
</style>

<script lang="ts">
import { defineComponent } from "vue";
import AccountWidget from "@/components/AccountWidget.vue";
import Icons from "@/icons/index.vue";
import { QUICK_LINKS } from "@/constants/index";

export default defineComponent({
  setup() {},
  data: () => ({ QUICK_LINKS }),
  components: { AccountWidget, Icons },
});
</script>
