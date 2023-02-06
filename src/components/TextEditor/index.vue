<template>
  <div class="texteditor">
    <!-- heading -->
    <div class="texteditor-heading">
      <div class="flex">
        <div class="flex-grow py-2">
          <input
            type="text"
            placeholder="Untitled"
            v-model="editableNote.title"
            class="outline-0 w-full text-lg focus:outline-none bg-transparent"
            maxlength="60"
            @keypress.enter="() => updateNote(['title'])"
            @blur="() => updateNote(['title'])"
          />

          <p class="text-gray-500 text-sm flex gap-2 items-center">
            <span>
              Last updated
              <UseTimeAgo
                v-slot="{ timeAgo }"
                :time="new Date(note.last_updated)"
              >
                {{ timeAgo }}
              </UseTimeAgo>
            </span>
            <span title="This note is accessible to everyone">
              <Icon
                v-if="editableNote.is_public"
                name="GlobeEuropeAfricaIcon"
                class="w-5 h-5"
              />
            </span>
          </p>
        </div>

        <div v-if="!isPublicNotePage" class="flex gap-2 items-center">
          <button
            v-if="contentUpdated && !note.is_archived"
            @click="saveNote"
            class="btn p-1 text-sm"
          >
            Changes made
          </button>
          <button
            v-if="!note.is_archived"
            class="btn p-1 h-min"
            @click="
              () => {
                editableNote.is_starred = !editableNote.is_starred;
                updateNote(['is_starred']);
              }
            "
          >
            <Icon
              name="StarIcon"
              class="w-5 h-5"
              :class="{ 'text-yellow-400': editableNote.is_starred }"
              :solid="editableNote.is_starred"
            />
          </button>

          <MenuList :list="menu" alignRight>
            <template v-slot:trigger="{ open }">
              <button @click="open" class="btn p-1">
                <Icon name="EllipsisVerticalIcon" class="w-5 h-5" />
              </button>
            </template>
          </MenuList>
        </div>
      </div>
    </div>

    <div
      v-if="note.is_archived"
      class="bg-yellow-50 border border-yellow-200 rounded-md mx-2 text-yellow-800 flex gap-2 px-4 py-2 mb-2 select-none"
    >
      <Icon name="LockClosedIcon" class="w-6 h-6" />
      <p>This note has been archived and is in read-only state</p>
    </div>

    <!-- tags -->
    <!-- <div class="texteditor-tags">
      <button
        class="btn flex items-center justify-center text-sm py-0.5 px-1 group"
        title="add tags"
      >
        <Icon name="PlusIcon" class="h-5 w-5" />
        <span class="text-sm">Tags</span>
      </button>
    </div> -->

    <!-- input -->
    <div v-if="editor" class="texteditor-input custom-scrollbar">
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script lang="ts">
import { EditorContent, BubbleMenu, JSONContent } from "@tiptap/vue-3";
import { UseTimeAgo } from "@vueuse/components";
import { ref, defineComponent, watch, computed } from "vue";
import Icon from "@/components/Icon";
import { Note, NoteUpdate } from "@/types/models";
import { onKeyStroke } from "@vueuse/core";
import { useNotesStore } from "@/stores/notes";
import { pickProperties } from "@/utils/helpers";
import { useIdle } from "@vueuse/core";
import MenuList from "@/components/Popup/MenuList.vue";
import { useAuthStore } from "@/stores/auth";
import useUtils from "@/composables/useUtils";
import useTextEditor from "@/composables/useTextEditor";

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
    Icon,
    UseTimeAgo,
    MenuList,
  },
  props: {
    modelValue: Object as () => JSONContent,
    note: { type: Object as () => Note, required: true },
  },
  emits: ["note:changed", "contextmenu:delete"],
  setup(props, { emit }) {
    const { isPublicNotePage } = useUtils();
    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const { editor, configureEditor, contentUpdated } = useTextEditor();

    const { idle } = useIdle(10 * 1000);
    const editableNote = ref({ ...props.note });

    const checkEditable = (note: Note) =>
      !note.is_archived && !note.is_trashed && !isPublicNotePage.value;

    const menu = computed(() =>
      notestore.noteContextMenu(props.note, {
        onNoteEdited: (notes) => {
          emit("note:changed", notes[0]);
        },
      })
    );

    watch(
      () => props.note,
      (currentPropNote: Note, oldPropNote: Note) => {
        if (editor.value) {
          editableNote.value = { ...currentPropNote };
          // edit the content of the editor if the notes are not the same
          console.log({
            oldPropNote: { ...oldPropNote },
            currentPropNote: { ...currentPropNote },
          });
          configureEditor(editableNote, oldPropNote.id !== currentPropNote.id);

          // if (!editor.value.isEditable) editor.value.setEditable(true);

          // // update the editable note with the actual note
          // // ...also we dont want to overrite the note we have when we update another attribute of the notes
          // // so when we refresh a note, anf the id is the same as the one we;re currently writng,
          // // if the content of the old note is the same as the content of the new note, dont write the editable note
          // editableNote.value = {
          //   ...currentPropNote,
          //   ...(oldPropNote.id === currentPropNote.id &&
          //   notestore.hasSimilarContent(oldPropNote, currentPropNote)
          //     ? { content: editableNote.value.content }
          //     : {}),
          // };

          // editor.value.commands.setContent(editableNote.value.content);
          // editor.value.setEditable(checkEditable(editableNote.value));
        }
      },
      { deep: true }
    );

    watch(idle, async () => {
      if (notestore.settings.autosave) await saveNote();
    });

    onKeyStroke(["Control", "s"], (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveNote();
      }
    });

    const saveNote = async () => {
      if (contentUpdated.value && checkEditable(editableNote.value)) {
        const note = await updateNote(["content"]);
        if (note) contentUpdated.value = false;
      }
    };

    const updateNote = async (updated_fields: Array<keyof NoteUpdate>) => {
      if (updated_fields.includes("title")) {
        let title = editableNote.value.title.trim().slice(0, 60) || "Untitled";
        editableNote.value.title = title;
      }

      const note = await notestore.updateNote(
        props.note,
        pickProperties(editableNote.value as NoteUpdate, updated_fields)
      );

      if (note) emit("note:changed", note);
      return note;
    };

    configureEditor(editableNote);

    return {
      contentUpdated,
      editableNote,
      updateNote,
      editor,
      saveNote,
      menu,
      authstore,
      notestore,
      isPublicNotePage,
    };
  },
});
</script>

<style lang="scss" scoped>
.texteditor {
  display: flex;
  flex-direction: column;
  @apply gap-2;

  &-heading {
    @apply px-2;
  }

  &-tags {
    display: flex;
    gap: 4px;
    @apply px-2;
  }

  &-input {
    flex-grow: 1;
    overflow-y: auto;
    @apply h-1 px-1 pb-10;

    div {
      height: 100%;
    }
  }
}
</style>
