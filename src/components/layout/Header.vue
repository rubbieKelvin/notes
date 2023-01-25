<template>
  <div class="flex gap-10 px-6 py-3 border-b border-stroke items-center">
    <div class="h-min">
      <h1 class="inline-flex gap-2 text-black">
        <NewspaperIcon class="w-5 h-5" />
        <span class="select-none">OpenNotes</span>
      </h1>
    </div>
    <div class="flex-grow">
      <SearchBar />
    </div>
    <div>
      <Avatar />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MagnifyingGlassIcon, NewspaperIcon } from "@heroicons/vue/24/outline";
import Avatar from "@/components/Avatar.vue";
import SearchBar from "@/components/SearchBar.vue";

export default defineComponent({
  components: { MagnifyingGlassIcon, Avatar, NewspaperIcon, SearchBar },
  setup() {},
});
</script>
