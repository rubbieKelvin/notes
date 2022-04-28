<template>
  <div>
    <div
      tabindex="0"
      @focus="closeOnClickOutside ? close() : null"
      class="modal"
      :class="{
        'bg-black bg-opacity-20': dim,
        'hidden pointer-events-none': !modelValue,
        flex: modelValue,
      }"
    >
      <div tabindex="0" ref="inner">
        <slot :close="close"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  @apply items-center justify-center;
  @apply fixed top-0 left-0 right-0 bottom-0;
}
</style>

<script>
import { ref } from "@vue/reactivity";
import { onMounted, watch } from "@vue/runtime-core";

export default {
  props: {
    dim: {
      type: Boolean,
      default: false,
    },
    closeOnClickOutside: {
      type: Boolean,
      default: false,
    },
    closeOnEsc: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const inner = ref(null);

    const close = () => ctx.emit("update:modelValue", false);

    const handleKeyDown = (e) => {
      if (e.keyCode === 27 && props.closeOnEsc) close();
    };

    onMounted(() => {
      inner.value.focus();
    });

    watch(
      () => props.modelValue,
      (value) => {
        if (value) document.addEventListener("keydown", handleKeyDown);
        else document.removeEventListener("keydown", handleKeyDown);
      }
    );

    return { inner, close };
  },
};
</script>
