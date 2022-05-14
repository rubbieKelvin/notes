<template>
  <div class="px-5 flex gap-3 items-center border-b border-b-gray-200">
    <div class="flex-grow h-full gap-2 flex items-center">
      <SearchIcon class="text-gray-300 w-5 h-5" />
      <input
        type="text"
        placeholder="Search Notes..."
        class="flex-grow outline-0 h-12 focus:outline-none"
        v-model="text"
      />
    </div>
    <ComboBox
      class="md:border"
      :list="sortingOptions"
      popupClasses="top-0 right-0"
      :getDefault="() => savedItem"
      :getItemText="(i) => i?.replace('_', ' ')"
      @selected="updateSortingSetting"
      v-slot="{ open, selectedText }"
    >
      <div class="flex gap-1 items-center pl-2">
        <button
          class="px-2 py-1 hover:bg-gray-100 rounded-md"
          @click="flipSortOrder"
        >
          <SortAscendingIcon
            v-if="order === ORDER.ACSENDING"
            class="w-4 h-4 text-gray-500"
          />
          <SortDescendingIcon v-else class="w-4 h-4 text-gray-500" />
        </button>
        <p
          class="text-gray-400 py-2 gap-1 pr-2 h-full flex text-sm font-semibold"
          @click="open"
        >
          <span class="md:flex hidden">Sort:</span>
          <span class="text-gray-900 capitalize">{{
            selectedText?.toLowerCase()?.replace("_", " ")
          }}</span>
        </p>
      </div>
    </ComboBox>
  </div>
</template>

<script>
import {
  SortAscendingIcon,
  SortDescendingIcon,
  SearchIcon,
} from "@heroicons/vue/outline";
import ComboBox from "@/components/controls/ComboBox.vue";
import { ORDER, OPTIONS as SORTING_OPTIONS } from "@/constants/sorting";
import { useStore } from "vuex";
import { ref } from "@vue/reactivity";
import { UPDATE_SETTINGS } from "@/constants/mutations";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/constants/settings";
import { computed, watch } from "@vue/runtime-core";

export default {
  components: { ComboBox, SortAscendingIcon, SearchIcon, SortDescendingIcon },
  emits: ["update:searchtext"],
  setup(props, ctx) {
    const store = useStore();
    const text = ref("");
    const sortingOptions = ref(Object.values(SORTING_OPTIONS));
    const savedItem = computed(
      () => store.state.settings[SETTING_KEYS.SORTING_TYPE]
    );

    watch(text, (value) => ctx.emit("update:searchtext", value));

    const updateSortingSetting = (item) => {
      store.commit(UPDATE_SETTINGS, { [SETTING_KEYS.SORTING_TYPE]: item });
    };

    const order = computed(
      () =>
        store.state.settings[SETTING_KEYS.SORTING_ORDER] ||
        DEFAULT_SETTINGS[SETTING_KEYS.SORTING_ORDER]
    );

    const flipSortOrder = () => {
      const newOrder =
        order.value === ORDER.ACSENDING ? ORDER.DESCENDING : ORDER.ACSENDING;
      store.commit(UPDATE_SETTINGS, { [SETTING_KEYS.SORTING_ORDER]: newOrder });
    };

    return {
      sortingOptions,
      updateSortingSetting,
      text,
      savedItem,
      flipSortOrder,
      order,
      ORDER,
    };
  },
};
</script>
