<template>
  <div class="popup-wrapper">
    <slot
      name="trigger"
      :open="
        () => {
          visible = true;
        }
      "
    />
    <div
      v-if="visible"
      class="popup"
      ref="popup"
      :class="{ 'popup-right': alignRight }"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { keybindingListening } from "@/plugins/shortcuts";
import { onClickOutside, onKeyDown } from "@vueuse/core";
import { computed, defineComponent, ref, watch } from "vue";

export default defineComponent({
  props: {
    escape: Boolean,
    alignRight: Boolean,
    modelValue: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    let _visible = ref(false);
    const popup = ref(null);
    const kb = keybindingListening();

    watch(
      () => props.modelValue,
      function (value) {
        visible.value = value;
      }
    );

    const visible = computed({
      get() {
        return _visible.value;
      },
      set(value: boolean) {
        _visible.value = value;
        emit("update:modelValue", value);
      },
    });

    onClickOutside(popup, (e) => {
      if (visible.value)
        window.requestAnimationFrame(() => (visible.value = false));
    });

    onKeyDown("Escape", (e) => {
      if (visible.value && props.escape) {
        e.preventDefault();
        visible.value = false;
      }
    });

    watch(visible, (v) => {
      if (v && props.escape) {
        window.requestAnimationFrame(() => (kb.value = false));
      }

      kb.value = true;
    });

    return { visible, popup };
  },
});
</script>

<style lang="scss" scoped>
.popup-wrapper {
  position: relative;
  > .popup {
    position: absolute;
    z-index: 10;

    + &-right {
      right: 0;
    }
  }
}
</style>
