<template>
  <div class="flex gap-1">
    <span
      v-for="key in sequence"
      :key="key"
      class="text-gray-500 bg-gray-100 border-stroke capitalize text-xs border rounded px-0.5"
    >
      {{ key }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    sequence: { type: Array as () => Array<string>, required: true },
  },
  setup() {},
});
</script>
