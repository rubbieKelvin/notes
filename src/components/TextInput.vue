<template>
  <div class="flex flex-col textinput">
    <div v-if="label || errorMessage" class="flex">
      <p class="text-sm flex grow textinput-label">{{ label }}</p>
      <p v-if="errorMessage" class="text-xs text-red-500 px-1 lg:text-sm">{{ errorMessage }}</p>
    </div>
    <div
      class="flex gap-3 border-2 px-3 py-2 rounded-md focus-within:border-accent border-themed-stroke items-center"
    >
      <Icon v-if="icon" :name="icon" class="w-6 h-6" />
      <input
        class="py-1.5 bg-transparent"
        :ref="focused ? 'focusedInputRef' : undefined"
        :autocomplete="autocomplete"
        :disabled="disabled || button?.loading"
        :type="inputType"
        :placeholder="placeholder"
        @keydown.enter="() => $emit('return', modelValue)"
        v-model="text"
      />
      <button
        class="textinput--button p-2"
        v-if="button?.action"
        @click="() => button?.action(modelValue || '')"
      >
        <Icon
          v-if="button.icon"
          :name="button.icon"
          class="w-5 h-5 textinput--button-icon"
        />
        <span v-if="button.text" class="textinput--button-text">{{
          button.text
        }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, ref, watch } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "./Icon/types";
import { useFocus } from "@vueuse/core";

export default defineComponent({
  components: { Icon },
  props: {
    autocomplete: String,
    label: String,
    errorMessage: String,
    icon: String as () => IconName,
    modelValue: String,
    focused: Boolean,
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: "Enter value..." },
    inputType: { type: String as () => "text" | "password", default: "text" },
    button: {
      type: Object as () => {
        text?: string;
        icon?: IconName;
        loading?: boolean;
        action: (text: string) => any;
      },
    },
  },
  emits: ["update:model-value", "return", "textinput"],
  setup(props, { emit }) {
    const text = ref(props.modelValue || "");
    const focusedInputRef: Ref<HTMLInputElement | null> = ref(null);

    watch(
      () => props.modelValue,
      () => {
        text.value = props.modelValue || "";
        emit("textinput", text.value);
      }
    );

    watch(text, () => {
      emit("update:model-value", text.value);
    });

    onMounted(() => {
      useFocus(focusedInputRef, { initialValue: true });
    });

    return { text, focusedInputRef };
  },
});
</script>

<style lang="scss" scoped>
input[type="text"],
input[type="password"] {
  @apply w-full outline-none;
}
</style>
