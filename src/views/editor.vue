<template>
  <div class="flex flex-grow w-full h-full">
    <TextEditor
      v-if="note && writableContent && authstore.isAuthenticated"
      v-model="writableContent"
      :note="note"
      class="flex-grow"
      @note:changed="
        (n) => {
          note = n;
        }
      "
    />
    <EmptyPage v-else />
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, watch, ref } from "vue";
import EmptyPage from "@/components/EmptyPage.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import { useRoute } from "vue-router";
import { Note } from "@/types/models";
import { JSONContent } from "@tiptap/core";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";

export default defineComponent({
  components: { EmptyPage, TextEditor },
  setup() {
    const route = useRoute();
    const notestore = useNotesStore();
    const authstore = useAuthStore();

    const note: Ref<Note | null> = ref(null);
    const writableContent: Ref<JSONContent | null> = ref(null);

    const openNote = async () => {
      if (
        route.name?.toString().endsWith("Note") &&
        authstore.isAuthenticated
      ) {
        // we want to select a note
        const readable_id = route.params?.identifier
          ? parseInt(route.params.identifier as string)
          : null;

        if (readable_id === null) return;

        // get note
        note.value = await notestore.getNoteByRiD(readable_id);
        writableContent.value = note.value?.content ?? null;
      }
    };

    watch(
      () => authstore.isAuthenticated,
      async () => {
        await openNote();
      },
      { immediate: true }
    );

    watch(
      () => route.fullPath,
      async () => {
        await openNote();
      },
      {
        deep: true,
        immediate: true,
      }
    );

    return { note, writableContent, authstore };
  },
});
</script>
