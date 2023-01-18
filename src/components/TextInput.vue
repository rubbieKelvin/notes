<template>
  <div class="flex flex-col">
    <div v-if="label || errorMessage" class="flex">
      <p class="text-sm flex grow">{{ label }}</p>
      <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
    </div>
    <div
      class="flex gap-2 border-2 p-2 rounded-md focus-within:border-accent border-stroke"
    >
      <Icon v-if="icon" :name="icon" class="w-5 h-5" />
      <input
        :autocomplete="autocomplete"
        :disabled="disabled"
        :type="inputType"
        :placeholder="placeholder"
        v-model="text"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "./Icon/types";

export default defineComponent({
  components: { Icon },
  props: {
    autocomplete: String,
    label: String,
    errorMessage: String,
    icon: String as () => IconName,
    modelValue: String,
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: "Enter value..." },
    inputType: { type: String as () => "text" | "password", default: "text" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const text = ref(props.modelValue || "");

    watch(
      () => props.modelValue,
      () => {
        text.value = props.modelValue || "";
      }
    );

    watch(text, () => {
      emit("update:modelValue", text.value);
    });

    return { text };
  },
});
</script>

<style lang="scss" scoped>
input[type="text"],
input[type="password"] {
  @apply w-full outline-none;
}
</style>