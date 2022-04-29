<template>
  <div v-if="data" class="">
    <p
      v-for="item in data.items"
      class="flex cursor-default gap-2 items-center py-1 hover:bg-gray-50 px-2"
      :key="item"
    >
      <span
        @click="doCheck(item)"
        :class="{
          bullet: !item.can_check,
          checkbox: item.can_check,
          checked,
          'un-checked': !checked,
        }"
      >
        <span v-if="item.can_check && item.checked"></span>
      </span>
      <span>{{ item.value }}</span>
    </p>
  </div>
</template>

<script>
import useNotes from "@/composables/useNotes";
// import { Note } from '@/lib/note';
export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
    parent: {
        type: Object,
        default: () => ({})
    }
  },
  setup(props) {
      const note = Note(props.parent)
    const { $updateNote } = useNotes();

    const doCheck = (item, value) => {
      if (!item.can_check) return;
      $updateNote()
    };
  },
};
</script>

<style scoped>
.bullet {
  @apply w-1 h-1 bg-black rounded-full;
}

.checkbox {
  @apply w-3 h-3 rounded;
}

.checked {
  @apply bg-blue-500;
}

.un-checked {
  @apply border border-gray-400;
  @apply hover:bg-gray-200;
}
</style>
