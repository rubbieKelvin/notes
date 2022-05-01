<template>
  <button class="flex rounded-md hover:bg-gray-100 hover:shadow-md items-center justify-center w-full gap-4 bg-white py-2">
    <slot />
    <span class="text-sm">
      {{ label }}
    </span>
  </button>
</template>

<script>
export default {
  props: {
    label: { type: String, default: "Button" },
  },
};
</script>
