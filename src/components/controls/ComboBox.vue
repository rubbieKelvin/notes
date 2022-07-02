<template>
  <slot name="display" :text="resolver(list[modelValue])" />
  <slot
    name="options"
    :options="
      list.map((item, index) => ({
        text: resolver(item),
        on: () => {
          $emit('update:modelValue', index);
        },
      }))
    "
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    modelValue: { type: Number, default: 0 },
    list: { type: Array, required: true },
    resolver: { type: Function, default: (i: any) => <string>(i as string) },
  },
  emits: <string[]>["update:modelValue"],
});
</script>
