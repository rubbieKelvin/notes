<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path :d="path" />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    path: { type: String, required: true },
  },
  setup() {},
});
</script>
