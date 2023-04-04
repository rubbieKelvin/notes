<template>
  <template v-if="item.link && typeof item.link === 'object'">
    <router-link :to="item.link" :title="item.title" :class="{ 'hidden md:flex': item.hideOnMobile }"
      class="flex gap-2 md:hover:bg-themed-hover-bg hover:bg-themed-accent-hover-bg select-none px-3 py-2 rounded-md">
      <Icon v-if="item.icon" :name="item.icon" class="w-6 h-6" />
      <MdiIcon v-if="item.mdiIconPath" :path="item.mdiIconPath" class="w-6 h-6" />
      <span class="capitalize hidden lg:flex flex-grow">{{ item.title }}</span>
      <Icon v-if="item.isExternal" name="ArrowTopRightOnSquareIcon"
        class="w-5 h-5 text-themed-text-subtle hidden lg:inline" />
    </router-link>
  </template>
  <template v-else-if="item.link && typeof item.link === 'string'">
    <a :href="item.link" :title="item.title" target="_blank" :class="{ 'hidden md:flex': item.hideOnMobile }"
      class="flex gap-2 md:hover:bg-themed-hover-bg hover:bg-themed-accent-hover-bg select-none px-3 py-2 rounded-md">
      <Icon v-if="item.icon" :name="item.icon" class="w-6 h-6" />
      <MdiIcon v-if="item.mdiIconPath" :path="item.mdiIconPath" class="w-6 h-6" />
      <span class="capitalize hidden lg:flex flex-grow">{{ item.title }}</span>
      <Icon v-if="item.isExternal" name="ArrowTopRightOnSquareIcon"
        class="w-5 h-5 text-themed-text-subtle hidden lg:inline" />
    </a>
  </template>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Icon from "@/components/Icon";
import { MenuItem } from "@/types";
import MdiIcon from "@/components/MdiIcon.vue";

export default defineComponent({
  components: { Icon, MdiIcon },
  props: {
    item: { type: Object as () => MenuItem, required: true },
  },
  setup() { },
});
</script>
