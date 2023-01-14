<template>
  <div>
    <div class="border border-stroke flex items-center gap-2 px-3 rounded-md">
      <MagnifyingGlassIcon class="w-5 h-5" />
      <input
        type="text"
        class="w-full py-2 outline-none"
        placeholder="Search tags, notes, folders, friends..."
        v-model="searchText"
        @keypress.enter="search"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useRouter } from "vue-router";

export default defineComponent({
  components: { MagnifyingGlassIcon },
  setup() {
    const searchText = ref("");
    const router = useRouter();

    const search = () => {
      console.log("searching");
      if (!searchText.value) return;
      const q = searchText.value;
      searchText.value = "";

      router.push({
        name: "Search",
        query: {
          q,
        },
      });
    };

    return { search, searchText };
  },
});
</script>
