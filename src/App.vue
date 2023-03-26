<template>
  <router-view class="notes-app-theme" :class="[theme.current]" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useThemeStore } from "./stores/theme";

export default defineComponent({
  setup() {
    const theme = useThemeStore();
    theme.loadTheme();
    return { theme };
  },
});
</script>
