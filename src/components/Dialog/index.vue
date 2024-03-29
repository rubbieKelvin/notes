<template>
  <div
    class="dialog fixed top-0 left-0 right-0 bottom-0 z-[8999]"
    :class="{
      'bg-black bg-opacity-20': dim && visible,
      'pointer-events-none': !dim || !visible,
      'glass-effect': glasseffect && visible,
      'no-glass-effect': !glasseffect || !visible,
    }"
  >
    <div
      v-if="visible"
      class="w-full h-full flex justify-center"
      :class="[verticalCenter ? 'items-center' : '', ...extraContainerClasses]"
    >
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
    glasseffect: Boolean,
    closeOnClickOutside: Boolean,
    modelValue: Boolean,
    verticalCenter: { type: Boolean, default: true },
    extraContainerClasses: { type: Array as () => string[], default: () => [] },
  },
  emits: ["update:model-value"],
  setup(props, { emit }) {
    const body = ref(null);

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:model-value", val);
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

<style lang="scss" scoped>
.glass-effect {
  backdrop-filter: blur(3px);
}

.no-glass-effect {
  backdrop-filter: none;
}
</style>
