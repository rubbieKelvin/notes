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
      :style="yOffset ? `bottom: ${yOffset}px;` : ''"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { onClickOutside, onKeyDown } from "@vueuse/core";
import { computed, defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "Popup",
  props: {
    escape: Boolean,
    alignRight: Boolean,
    yOffset: Number,
    modelValue: Boolean,
  },
  emits: ["update:model-value"],
  setup(props, { emit }) {
    let _visible = ref(false);
    const popup = ref(null);

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
        emit("update:model-value", value);
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

    return { visible, popup };
  },
});
</script>

<style lang="scss" scoped>
.popup-wrapper {
  position: relative;
  > .popup {
    position: absolute;
    margin-top: 0.5em;
    z-index: 1000;

    + &-right {
      right: 0;
    }
  }
}
</style>
