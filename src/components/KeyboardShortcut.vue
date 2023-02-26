<template>
  <div class="flex gap-1">
    <span
      v-for="key in sequence"
      :key="key"
      class=" text-themed-text-subtle bg-themed-bg-elevated border-themed-stroke capitalize text-xs border rounded p-0.5"
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
