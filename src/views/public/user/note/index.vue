<template>
  <div class="h-full flex flex-col">
    <public-heading :note="note || undefined" />
    <template v-if="note">
      <div class="container mx-auto flex px-4 flex-grow">
        <NoteDetails
          :note="note"
          class="w-72 md:inline-block hidden px-4 pt-6"
        />
        <div
          class="h-full flex flex-col flex-grow md:border-l md:border-l-themed-stroke px-2 md:px-4 pt-6"
        >
          <div class="pb-4">
            <h1 class="text-2xl font-medium">{{ note.title }}</h1>
          </div>
          <div class="flex-grow">
            <EditorContent :editor="editor" />
          </div>
        </div>
      </div>
      <div></div>
    </template>
  </div>
</template>

<script lang="ts">
import NoteDetails from "@/components/NoteDetails.vue";
import { useNotesStore } from "@/stores/notes";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { Note } from "@/types/models";
import { defineComponent, onMounted, Ref, ref } from "vue";
import { useRoute } from "vue-router";
import PublicHeading from "./PublicHeading.vue";
import { extensions } from "@/composables/useTextEditor";

export default defineComponent({
  components: {
    PublicHeading,
    NoteDetails,
    EditorContent,
  },
  setup() {
    const note: Ref<Note | null> = ref(null);
    const fetchState = ref({
      fetching: false,
      noteexists: false,
      errormessage: "",
    });
    const notestore = useNotesStore();
    const route = useRoute();

    // fetch note
    const username = route.params?.username as string;
    const identifier = route.params?.identifier as string;

    if (!(username || identifier)) {
      fetchState.value.errormessage = "Cant fetch note";
    }

    const editor = useEditor({
      editable: false,
      extensions,
    });

    onMounted(async () => {
      fetchState.value.fetching = true;
      note.value = await notestore.getNoteByRiD(
        parseInt(identifier),
        username,
        true
      );

      fetchState.value.fetching = false;
      fetchState.value.noteexists = !!(
        note.value && Object.keys(note.value).length > 0
      );

      if (note.value?.content && fetchState.value.noteexists && editor.value) {
        editor.value.commands.setContent(note.value.content);
      }
    });

    return { note, editor };
  },
});
</script>
