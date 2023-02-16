<template>
  <div class="border-b border-themed-stroke">
    <div
      class="flex justify-between gap-4 md:gap-10 px-6 py-3 items-center container mx-auto"
    >
      <div class="h-min">
        <h1 class="gap-2 text-black flex">
          <NewspaperIcon class="w-5 h-5" />
          <span class="select-none hidden md:inline">OpenNotes</span>
        </h1>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NewspaperIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: {
    NewspaperIcon,
  },
  setup() {
    return {};
  },
});
</script>
