<template>
  <div>
    <div class="border border-stroke flex items-center gap-2 px-3 rounded-md">
      <MagnifyingGlassIcon class="w-5 h-5" />
      <input
        type="text"
        class="w-full py-2 outline-none"
        placeholder="Search tags, notes, folders, friends..."
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: { MagnifyingGlassIcon },
  setup() {},
});
</script>
