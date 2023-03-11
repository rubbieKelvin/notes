<template>
  <div class="flex bg-themed-bg text-themed-text flex-grow h-full w-1">
    <TextEditor
      v-if="note && writableContent"
      v-model="writableContent"
      :note="note"
      class="flex-grow h-full w-full"
      @contextmenu:delete="deleteNote"
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
import {
  defineComponent,
  Ref,
  watch,
  ref,
  computed,
  WritableComputedRef,
} from "vue";
import EmptyPage from "@/components/EmptyPage.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import { useRoute, useRouter } from "vue-router";
import { Note } from "@/types/models";
import { JSONContent } from "@tiptap/core";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";

export default defineComponent({
  components: { EmptyPage, TextEditor },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const notestore = useNotesStore();
    const authstore = useAuthStore();

    const note: WritableComputedRef<Note | null> = computed({
      get() {
        return notestore.openedNote;
      },
      set(note: Note | null) {
        notestore.openedNote = note;
      },
    });
    const writableContent: Ref<JSONContent | null> = ref(null);

    const openNote = async () => {
      if (route.name?.toString().endsWith("Note")) {
        // we want to select a note
        const id = route.params?.identifier
          ? (route.params.identifier as string)
          : null;

        if (id === null) return;

        // get note
        notestore.openNote(id);
      }
    };

    watch(
      () => [route.fullPath, authstore.isAuthenticated],
      async () => {
        await openNote();
      },
      {
        deep: true,
        immediate: true,
      }
    );

    watch(
      note,
      () => {
        writableContent.value = note.value?.content ?? null;
      },
      { deep: true }
    );

    const deleteNote = async () => {
      if (note.value) {
        const res = await notestore.deleteNotes([note.value.id]);
        if (res) {
          note.value = null;
          router.back();
        }
      }
    };

    return { note, writableContent, authstore, deleteNote };
  },
});
</script>
