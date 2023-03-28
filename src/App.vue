<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, watch } from "vue";
import { useThemeStore } from "./stores/theme";

export default defineComponent({
  setup() {
    const theme = useThemeStore();
    theme.loadTheme();

    watch(
      () => theme.current,
      () => {
        document.body.setAttribute("theme", theme.current);
      },
      { immediate: true }
    );
    return { theme };
  },
});
</script>
