<template>
  <div
    class="dialog fixed top-0 left-0 right-0 bottom-0 z-10"
    :class="{
      'bg-black bg-opacity-20': dim && visible,
      'pointer-events-none': !dim || !visible,
    }"
  >
    <div v-if="visible" class="w-full h-full flex items-center justify-center">
      <div class="pointer-events-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";

export default defineComponent({
  name: "Dialog",
  props: {
    dim: Boolean,
    modelValue: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", val);
      },
    });
    return { visible };
  },
});
</script>
