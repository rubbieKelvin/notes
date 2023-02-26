<template>
  <div class="text-themed-text">
    <div
      class="border border-themed-stroke bg-themed-bg-elevated flex items-center gap-2 px-3 rounded-md"
    >
      <MagnifyingGlassIcon class="w-5 h-5" />
      <input
        ref="input"
        type="text"
        class="w-full py-2 outline-none bg-transparent"
        placeholder="Search tags, notes, folders, friends..."
        v-model="searchText"
        @keypress.enter="search"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useRouter } from "vue-router";
import { onStartTyping } from "@vueuse/core";

export default defineComponent({
  components: { MagnifyingGlassIcon },
  setup() {
    const searchText = ref("");
    const input: Ref<HTMLInputElement | null> = ref(null);
    const router = useRouter();

    const search = () => {
      if (!searchText.value) return;
      const q = searchText.value;

      router.push({
        name: "Search",
        query: {
          q,
        },
      });
    };

    onStartTyping(() => {
      if (input.value) input.value.focus();
    });

    return { search, searchText, input };
  },
});
</script>
