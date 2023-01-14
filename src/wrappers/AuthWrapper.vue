<template>
  <div>
    <slot />
    <UiDialog dim v-model="modalOpen">
      <div
        class="p-2 border-stroke border bg-white rounded-md min-w-[400px]"
      ></div>
    </UiDialog>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import UiDialog from "@/components/Dialog/index.vue";

export default defineComponent({
  components: {
    UiDialog,
  },
  setup() {
    const authenticated = ref(false);
    return { modalOpen: computed(() => !authenticated.value) };
  },
});
</script>
