<template>
  <div class="texteditor md:px-0 px-4">
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
            :disabled="saveStatus === 'saving'"
            class="btn p-2 text-sm flex items-center gap-2"
            :title="`Changes made to ${note.title}. click to save`"
          >
            <Icon
              v-if="saveStatus === 'error'"
              name="ExclamationTriangleIcon"
              class="text-red-500 w-4 h-4"
            />
            <svg v-else class="overflow-visible" width="12" height="12">
              <circle
                cx="6"
                cy="6"
                r="3"
                class="fill-current"
                :class="{ tofrocircle: saveStatus === 'saving' }"
              />
            </svg>
            <span
              class="text-xs font-bold md:inline hidden"
              :class="[
                saveStatus === 'error' ? 'text-red-500' : 'text-gray-600',
              ]"
              >{{
                { saving: "Saving", error: "Save error", null: "Changes made" }[
                  `${saveStatus}`
                ]
              }}</span
            >
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
      <floating-menu :editor="editor" />
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script lang="ts">
import { EditorContent, JSONContent } from "@tiptap/vue-3";
import { UseTimeAgo } from "@vueuse/components";
import { ref, defineComponent, watch, computed, Ref } from "vue";
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
import FloatingMenu from "./FloatingMenu.vue";

type SaveStatus = "saving" | "error" | null;

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    Icon,
    UseTimeAgo,
    MenuList,
    FloatingMenu,
  },
  props: {
    modelValue: Object as () => JSONContent,
    note: { type: Object as () => Note, required: true },
  },
  emits: ["note:changed", "contextmenu:delete"],
  setup(props, { emit }) {
    // maps a notes id to it's status
    const savingStatuses: Ref<Record<string, SaveStatus>> = ref({});

    const { isPublicNotePage } = useUtils();
    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const { editor, configureEditor, contentUpdated, editableNote } =
      useTextEditor();

    const { idle } = useIdle(10 * 1000);

    const checkEditable = (note: Note) =>
      !note.is_archived && !note.is_trashed && !isPublicNotePage.value;

    const menu = computed(() =>
      notestore.noteContextMenu(props.note, {
        onNoteEdited: (notes) => {
          emit("note:changed", notes[0]);
        },
      })
    );

    const saveStatus = computed(() => {
      const stat = savingStatuses.value[editableNote.value.id] ?? null;
      return stat;
    });

    watch(
      () => props.note,
      (currentPropNote: Note, oldPropNote: Note) => {
        if (editor.value) {
          editableNote.value = { ...currentPropNote };

          // edit the content of the editor if the notes are not the same
          const isTheSameNote = oldPropNote.id === currentPropNote.id;
          configureEditor(!isTheSameNote);
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
      if (
        contentUpdated.value &&
        checkEditable(editableNote.value) &&
        saveStatus.value !== "saving"
      ) {
        savingStatuses.value[editableNote.value.id] = "saving";

        // a snapshot of the note we are saving
        const noteWereCurrentlySaving = {
          ...editableNote.value,
          content: { ...editableNote.value.content },
        };

        try {
          const note = await updateNote(["content"]);
          if (note && noteWereCurrentlySaving.id === editableNote.value.id) {
            // if the note was updated and were currelty seeing that note, update the updated status
            // at this point if we edited the note prior, we still want to see changes made
            contentUpdated.value =
              JSON.stringify(noteWereCurrentlySaving.content) !==
              JSON.stringify(editableNote.value.content);
            savingStatuses.value[editableNote.value.id] = null;
          } else {
            savingStatuses.value[editableNote.value.id] = "error";
          }
        } catch {
          savingStatuses.value[editableNote.value.id] = "error";
        }
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

    editableNote.value = props.note;
    configureEditor();

    return {
      saveStatus,
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

@keyframes tofro {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.tofrocircle {
  translate: 50%;
  animation: tofro 1s linear infinite;
}
</style>
