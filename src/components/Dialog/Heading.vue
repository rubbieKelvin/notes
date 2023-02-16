<template>
  <div class="md:pb-2 md:pt-0 py-3 md:px-3 px-4 border-b border-stroke flex">
    <p class="flex-grow font-medium text-2xl md:text-xl">{{ title }}</p>
    <button
      v-for="button in buttons"
      :key="button.icon"
      :disabled="!!button.disabled"
      class="btn p-2 md:p-1"
      :class="{ 'text-gray-300': !!button.disabled }"
      @click="button.action"
    >
      <Icon :name="button.icon" class="w-5 h-5" />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { IconName } from "../Icon/types";
import Icon from "@/components/Icon";

export default defineComponent({
  components: { Icon },
  props: {
    title: { type: String, default: "Title" },
    buttons: {
      type: Array as () => {
        icon: IconName;
        disabled?: boolean;
        action: () => any;
      }[],
      default: () => [],
    },
  },
  setup() {},
});
</script>
