<template>
  <div>
    <p v-html="text" />
  </div>
</template>

<script>
import { computed } from "@vue/runtime-core";

export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
    editing: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    const text = computed(() => {
      let cleaned = props.data.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      Object.entries(props.data.links || {}).forEach(([key, value]) => {
        cleaned = cleaned.replace(
          key,
          `<a class="embedded-link" target="_blank" href="${value}">${key}</a>`
        );
      });

      return cleaned;
    });

    return { text };
  },
};
</script>

<style scoped>
:deep(.embedded-link) {
  @apply text-blue-500;
}
</style>
