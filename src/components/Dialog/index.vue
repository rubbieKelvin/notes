<template>
  <div
    class="dialog fixed top-0 left-0 right-0 bottom-0 z-10"
    :class="{
      'bg-black bg-opacity-60': dim && visible,
      'pointer-events-none': !dim || !visible,
    }"
  >
    <div v-if="visible" class="w-full h-full flex items-center justify-center">
      <div ref="body" class="pointer-events-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { onClickOutside, onKeyDown } from "@vueuse/core";

export default defineComponent({
  name: "Dialog",
  props: {
    dim: Boolean,
    escape: Boolean,
    closeOnClickOutside: Boolean,
    modelValue: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const body = ref(null);

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", val);
      },
    });

    onClickOutside(body, (e) => {
      if (visible.value && props.closeOnClickOutside) {
        window.requestAnimationFrame(() => (visible.value = false));
      }
    });

    onKeyDown("Escape", (e) => {
      if (visible.value && props.escape) {
        e.preventDefault();
        visible.value = false;
      }
    });

    return { visible, body };
  },
});
</script>
