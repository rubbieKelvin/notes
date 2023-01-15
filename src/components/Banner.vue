<template>
  <div
    class="bg-opacity-20 rounded-md select-none overflow-hidden"
    :class="[modelValue ? 'h-auto' : 'h-0']"
  >
    <!-- content -->
    <div class="flex gap-2 p-2">
      <Icon v-if="icon" :name="icon" class="w-5 h-5" />
      <div>
        <p>{{ modelValue }}</p>
      </div>
    </div>
    <!-- progress -->
    <div class="h-1 bg-inherit" :style="`width: ${count}%;`" />
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
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const count = ref(0);
    let timer: null | number = null;
    watch(
      () => props.modelValue,
      () => {
        count.value = 0;
        if (!props.modelValue) return;
        timer = setInterval(() => {
          count.value += 1;
          if (count.value == 100) {
            emit("update:modelValue", "");
            clearInterval(timer as number);
          }
        }, 50);
      }
    );

    return { count };
  },
});
</script>
