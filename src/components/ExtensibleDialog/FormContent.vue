<template>
  <div v-if="modelValue" class="form-content">
    <template v-for="item in content">
      <TextInput
        v-if="item.type == 'textinput' && item.textinput"
        v-model="modelValue[item.id]"
        :key="item.id"
        :icon="item.textinput.icon"
        :label="item.textinput.label"
        :errorMessage="textinput_errormessage"
        :placeholder="item.textinput.placeholder"
        :button="item.textinput.button"
        :focused="item.textinput.focus"
        @textinput="
          (text) => {
            if (item.textinput?.validateInput) {
              textinput_errormessage =
                item.textinput.validateInput(text).message;
            }
          }
        "
        @return="item.textinput?.keydownReturn"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { FormContentItem } from "@/stores/modals";
import { defineComponent, ref } from "vue";
import TextInput from "../TextInput.vue";

export default defineComponent({
  props: {
    modelValue: { type: Object },
    content: { type: Array as () => FormContentItem[], required: true },
  },
  components: { TextInput },
  emits: ["update:model-value"],
  setup() {
    const textinput_errormessage = ref("");
    return { textinput_errormessage };
  },
});
</script>

<style lang="scss" scoped>
:deep(.textinput--button-text) {
  @apply uppercase text-sm font-medium text-themed-accent-bg;
}
</style>
