<template>
  <p class="flex cursor-default gap-2 items-center py-1 hover:bg-gray-50 px-2">
    <span
      @click="doCheck()"
      :class="{
        bullet: !computedItem.checkable,
        checkbox: computedItem.checkable,
        checked: computedItem.checked,
        'un-checked': !computedItem.checked,
      }"
    >
      <span
        v-if="computedItem.checkable && computedItem.checked"
        class="flex items-center justify-center"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M9.20716 3.45139C9.30089 3.54515 9.35355 3.6723 9.35355 3.80489C9.35355 3.93747 9.30089 4.06462 9.20716 4.15839L5.20716 8.15839C5.11339 8.25212 4.98624 8.30478 4.85366 8.30478C4.72108 8.30478 4.59392 8.25212 4.50016 8.15839L2.50016 6.15839C2.40908 6.06408 2.35868 5.93778 2.35982 5.80669C2.36096 5.67559 2.41354 5.55018 2.50625 5.45748C2.59895 5.36477 2.72436 5.31219 2.85546 5.31105C2.98656 5.30991 3.11286 5.36031 3.20716 5.45139L4.85366 7.09789L8.50016 3.45139C8.59392 3.35765 8.72108 3.30499 8.85366 3.30499C8.98624 3.30499 9.11339 3.35765 9.20716 3.45139Z"
            fill="white"
          />
        </svg>
      </span>
    </span>
    <span>{{ computedItem.value }}</span>
  </p>
</template>

<script>
import { ref } from "@vue/runtime-core";
import useNotes from "@/composables/useNotes";
import { useStore } from "vuex";
import { ADD_ITEM } from "@/constants/mutations";

export default {
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const { getDBItems } = useNotes();
    const store = useStore();
    const computedItem = ref(getDBItems({ ld: props.item.ld })[0]);

    const doCheck = () => {
      const val = {
        ...computedItem.value,
        checked: !computedItem.value.checked,
      };
      computedItem.value = val;

      store.commit(ADD_ITEM, val);
    };
    return { computedItem, doCheck };
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
