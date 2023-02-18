<template>
  <router-link
    v-if="item.link && typeof item.link === 'object'"
    :to="item.link"
    :title="item.title"
    class="flex gap-2 hover:bg-themed-hover-bg select-none px-3 py-2 rounded-md"
  >
    <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5 text-black" />
    <span class="capitalize hidden lg:flex">{{ item.title }}</span>
  </router-link>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Icon from "@/components/Icon";
import { MenuItem } from "@/types";

export default defineComponent({
  components: { Icon },
  props: {
    item: { type: Object as () => MenuItem, required: true },
  },
  setup() {},
});
</script>
