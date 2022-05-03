<template>
  <div class="px-5 flex gap-3 items-center border-b border-b-gray-200">
    <div class="flex-grow h-full gap-2 flex items-center">
        <SearchIcon class="text-gray-300 w-5 h-5"/>
        <input type="text" placeholder="Search Notes..." class="flex-grow outline-0 h-12">
    </div>
    <ComboBox>
      <div class="flex gap-3 items-center">
        <SortAscendingIcon class="w-4 h-4 text-gray-500" />
        <p class=" text-gray-400 text-sm font-semibold">Sort: <span class=" text-gray-900">Default</span></p>
      </div>
    </ComboBox>
  </div>
</template>

<script>
import { SortAscendingIcon, SearchIcon } from "@heroicons/vue/outline";
import ComboBox from "@/components/controls/ComboBox.vue";

export default {
  components: { ComboBox, SortAscendingIcon, SearchIcon },
};
</script>