<template>
  <div class="text-themed-text min-w-full md:min-w-[60rem]">
    <div
      class="border border-themed-stroke bg-themed-bg-elevated flex items-center gap-2 px-3 rounded-md"
    >
      <MagnifyingGlassIcon class="w-5 h-5" />

      <p
        class="py-2 text-themed-text-subtle select-none w-full"
        @click="searchmodalopen = true"
      >
        <span class="hidden sm:inline-block">
          Search tags, notes, folders, friends...
        </span>
        <span class="sm:hidden"> Search... </span>
      </p>
    </div>

    <SelectionDialog
      v-model="searchmodalopen"
      :perform-search="performSearch"
      @searchmodalclose="closeModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useRouter } from "vue-router";
import { onStartTyping, useTimeAgo } from "@vueuse/core";
import SelectionDialog from "./SelectionDialog.vue";
import { SearchedItem } from "@/types";
import { useNotesStore } from "@/stores/notes";
import { noteRoute } from "@/composables/useNavigation";

export default defineComponent({
  components: { MagnifyingGlassIcon, SelectionDialog },
  setup() {
    const searchText = ref("");
    const input: Ref<HTMLInputElement | null> = ref(null);
    const router = useRouter();
    const searchmodalopen = ref(false);
    const notestore = useNotesStore();

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
      searchmodalopen.value = true;
    });

    async function performSearch(query?: string): Promise<SearchedItem[]> {
      if (!query) return [];

      const matchedByTitle = notestore.basicNotes.filter((note) =>
        note.title.toLowerCase().includes(query.toLowerCase())
      );

      const matchedByContent = notestore.basicNotes.filter(
        (note) =>
          JSON.stringify(note.content)
            .toLowerCase()
            .includes(query.toLowerCase()) && !matchedByTitle.includes(note)
      );

      return [
        ...matchedByTitle.map(
          (note): SearchedItem => ({
            title: note.title,
            subtitle: useTimeAgo(new Date(note.last_updated)).value,
            group: "title",
            icon: "TagIcon",
            action: () => {
              router.push(noteRoute(note));
            },
          })
        ),
        ...matchedByContent.map(
          (note): SearchedItem => ({
            title: note.title,
            subtitle: useTimeAgo(new Date(note.last_updated)).value,
            group: "content",
            icon: "NewspaperIcon",
            action: () => {
              router.push(noteRoute(note));
            },
          })
        ),
      ];
    }

    function closeModal() {
      searchmodalopen.value = false;
    }
    return {
      search,
      searchText,
      input,
      searchmodalopen,
      performSearch,
      closeModal,
    };
  },
});
</script>
