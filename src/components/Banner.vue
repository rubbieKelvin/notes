<template>
  <div
    class="bg-opacity-20 rounded-md select-none overflow-hidden"
    :class="[modelValue ? 'h-auto' : 'h-0']"
  >
    <!-- content -->
    <div class="flex gap-3 px-3 py-2 items-center">
      <Icon v-if="icon" :name="icon" class="w-5 h-5" />
      <div>
        <p :class="{ 'font-bold': !!subtitle }">{{ modelValue }}</p>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <!-- progress -->
    <div v-if="useTimer" class="h-1 bg-inherit" :style="`width: ${count}%;`" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "./Icon/types";

export default defineComponent({
  components: { Icon },
  props: {
    icon: String as () => IconName,
    modelValue: String,
    subtitle: String,
    useTimer: { type: Boolean, default: true },
  },
  emits: ["update:model-value"],
  setup(props, { emit }) {
    const count = ref(0);
    let timer: null | number = null;
    watch(
      () => props.modelValue,
      () => {
        count.value = 0;
        if (!props.modelValue || !props.useTimer) return;
        timer = setInterval(() => {
          count.value += 1;
          if (count.value == 100) {
            emit("update:model-value", "");
            clearInterval(timer as number);
          }
        }, 50);
      }
    );

    return { count };
  },
});
</script>
