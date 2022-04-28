<template>
  <div v-if="data" class="">
    <p v-for="item in data.items" class="flex cursor-default gap-2 items-center py-1 hover:bg-gray-100 px-2" :key="item">
        <span :class="{bullet: !item.can_check, checkbox: item.can_check }"></span>
        <span>{{ item.value }}</span>
    </p>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.bullet{
    @apply w-1 h-1 bg-black rounded-full;
}

.checkbox{
    @apply w-3 h-3 rounded bg-blue-400;
}
</style>