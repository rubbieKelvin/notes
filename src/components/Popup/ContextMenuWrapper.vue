<template>
  <div>
    <div @contextmenu="handleContextMenu">
      <slot name="wrapper" />
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    return {
      handleContextMenu: (e: MouseEvent) => {
        console.log(e);
      },
    };
  },
});
</script>
