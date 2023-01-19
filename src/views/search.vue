<template>
  <div>
    <PageHeader :title="queryString ? 'Search' : 'Recent Searches'">
      <span
        v-show="queryString && notes.length > 0"
        class="text-sm text-gray-600"
        >{{ notes.length }} result{{ notes.length > 1 ? "s" : "" }}</span
      >
    </PageHeader>
    <div>
      <Empty v-if="notes.length === 0" :loading="loading" />
      <template v-else>
        <NotesItem v-for="note in notes" :key="note.id" :note="note" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import Empty from "@/components/layout/ApplicationMenu/Empty.vue";
import { computed, defineComponent, ref, Ref, watch } from "vue";
import { useNotesStore } from "@/stores/notes";
import { Note } from "@/types/models";
import { useRoute, useRouter } from "vue-router";
import NotesItem from "@/components/NotesItem.vue";
import { onKeyStroke } from "@vueuse/core";

export default defineComponent({
  components: { PageHeader, Empty, NotesItem },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const notestore = useNotesStore();

    const loading = ref(false);
    const notes: Ref<Note[]> = ref([]);
    const queryString = computed(() => {
      return (route.query.q as string | undefined) ?? null;
    });

    onKeyStroke(["Escape"], (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.back();
      }
    });

    watch(
      queryString,
      async () => {
        if (queryString.value) {
          loading.value = true;
          notes.value = await notestore.searchNotes(queryString.value);
          loading.value = false;
        }
      },
      { immediate: true }
    );

    return { notes, route, queryString, loading };
  },
});
</script>
