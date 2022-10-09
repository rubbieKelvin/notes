<template>
  <div class="fixed bottom-0 left-0">
    <div class="p-4 flex flex-col gap-2" :key="tick">
      <div
        v-for="toast in data"
        :key="toast.id"
        class="bg-gray-200 text-black overflow-clip rounded-md"
      >
        <!-- content -->
        <div class="flex items-center gap-4 py-2 px-4 min-w-[350px]">
          <Icon v-if="toast.icon" :name="toast.icon" class="w-6 h-6" />

          <div class="flex flex-grow flex-col min-w-[120px]">
            <p class="">{{ toast.title }}</p>
            <p class="text-sm text-gray-400">{{ toast.desciption }}</p>
          </div>

          <div class="flex gap-1">
            <button
              v-for="(action, aindex) in toast.actions"
              :key="aindex"
              @click="action.action"
              class="text-sm bg-gray-800 px-3 py-2 rounded-md hover:bg-gray-900 text-gray-200 hover:text-white"
            >
              {{ action.title }}
            </button>
          </div>
        </div>

        <!-- progress -->
        <div
          v-if="toast.timeout && toast.meta"
          class="w-full bg-black bg-opacity-20 h-1"
        >
          <div
            :style="{ width: `${toast.meta.progress}%` }"
            class="bg-red-500 h-1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Icon from "./Icon";
import { ToastData } from "@/types";
import { defineComponent, inject, onMounted, onUnmounted, ref, Ref } from "vue";

export default defineComponent({
  components: { Icon },
  setup() {
    const data = inject("toasts") as Ref<ToastData[]>;
    const tick = ref(0);
    let tick_timer: number | null = null;

    onMounted(() => {
      tick_timer = setInterval(() => {
        if (data.value.find((toast) => !!toast.timeout))
          tick.value = tick.value === 0 ? 1 : 0;
      }, 50);
    });

    onUnmounted(() => {
      if (tick_timer !== null) clearInterval(tick_timer);
    });

    return { data, tick };
  },
});
</script>
