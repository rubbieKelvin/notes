<template>
  <div class="border relative select-none rounded-md border-gray-200 p-2">
    <slot :open="open" />
    <div tabindex="0" ref="popup" class="absolute hidden focus:flex flex-col focus-within:flex bg-white shadow-lg top-0 left-0 right-0 rounded-md py-2">
      <div v-for="item in list" :key="getItemText(item)" class="px-4 py-2">
        {{ getItemText(item) }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "@vue/reactivity";

export default {
  props: {
    list: {
      type: Array,
      default: () => [],
    },
    getItemText: {
      // use this to get the item text from an item,
      // useful if item is a object
      type: Function,
      default: () => (item) => item,
    },
  },
  setup() {
    const popup = ref(null)
    const open = () => popup.value.focus();

    return { open, popup };
  },
};
</script>
