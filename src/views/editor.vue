<template>
  <div class="flex flex-grow h-full w-1" :class="{ 'px-5': isPublicNotePage }">
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
import useUtils from "@/composables/useUtils";

export default defineComponent({
  components: { EmptyPage, TextEditor },
  setup() {
    const { isPublicNotePage } = useUtils();
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
        const readable_id = route.params?.identifier
          ? parseInt(route.params.identifier as string)
          : null;

        if (readable_id === null) return;

        // get note
        notestore.openNote(
          readable_id,
          isPublicNotePage.value ? (route.params?.username as string) : null
        );
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

    return { note, writableContent, authstore, deleteNote, isPublicNotePage };
  },
});
</script>
