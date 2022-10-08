<template>
  <div class="flex gap-2 hover:bg-hover select-none px-3 py-2 rounded-md">
    <Icon :name="icon" class="w-5 h-5 text-black" />
    <span class="capitalize">{{ title }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "@/components/Icon/types";

export default defineComponent({
  components: { Icon },
  props: {
    icon: { type: String as () => IconName, required: true },
    title: { type: String, required: true },
  },
  setup() {},
});
</script>
