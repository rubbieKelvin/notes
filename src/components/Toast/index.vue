<template>
  <div class="fixed bottom-5 left-0 right-0 md:right-auto z-[9999]">
    <div class="p-4 flex flex-col gap-2">
      <ToastItem v-for="toast in toasts" :key="toast.id" :toast="toast" />
    </div>
  </div>
</template>

<script lang="ts">
import Icon from "@/components/Icon";
import { ToastData } from "@/types";
import { computed, ComputedRef, defineComponent } from "vue";
import { useToast } from "@/stores/toasts";
import ToastItem from "./Item.vue";

export default defineComponent({
  components: { Icon, ToastItem },
  setup() {
    const toaststore = useToast();

    const toasts: ComputedRef<ToastData[]> = computed(() => toaststore.toasts);

    return { toasts };
  },
});
</script>
