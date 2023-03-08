<template>
  <div class="texteditor md:px-0 px-4">
    <!-- heading -->
    <div class="texteditor-heading">
      <div class="flex">
        <div class="flex-grow py-2">
          <input
            type="text"
            placeholder="Untitled"
            v-model="computedTitle"
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

        <div class="flex gap-2 items-center">
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
            <svg
              v-else
              class="overflow-visible text-themed-accent-bg"
              width="12"
              height="12"
            >
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
                saveStatus === 'error' ? 'text-red-500' : 'text-themed-text',
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
    <div v-if="features.features[FEATURES.TAGS]" class="texteditor-tags">
      <div
        v-for="tagm in editableNote.tag_attachments"
        :key="tagm.id"
        class="border border-themed-stroke rounded-md"
      >
        <span class="px-1 text-sm">{{ tagm.tag.title }}</span>
        <button class="px-1 btn border-0 h-full rounded-none border-l">
          <Icon name="XMarkIcon" class="w-3 h-3" />
        </button>
      </div>
      <button
        @click="tagSelectOpen = true"
        class="btn flex items-center justify-center text-sm py-0.5 px-1 group"
        title="add tags"
      >
        <Icon name="PlusIcon" class="h-3 w-3" />
        <span class="text-xs uppercase ml-1">Tags</span>
      </button>
    </div>

    <!-- input -->
    <div
      v-if="editor"
      class="texteditor-input custom-scrollbar flex justify-center"
    >
      <floating-menu :editor="editor" />
      <editor-content
        :editor="editor"
        class="w-full max-w-[50rem] lg:max-w-[55rem]"
      />
    </div>

    <SelectionDialog
      v-model="modals.movetofolder"
      resourceType="folder"
      :performSearch="searchFolders"
      :doCreateItem="doCreateFolder"
    />
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
import { noteContextMenu } from "@/utils/contextmenus";
import useTextEditor from "@/composables/useTextEditor";
import FloatingMenu from "./FloatingMenu.vue";
import SelectionDialog from "../SelectionDialog.vue";
import { FEATURES, useFeatures } from "@/stores/features";
import { filePathTree, nodeItemName, nodeItemPath } from "@/utils/grouping";
import { MenuItem, SearchedItem } from "@/types";

type SaveStatus = "saving" | "error" | null;

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    Icon,
    UseTimeAgo,
    MenuList,
    FloatingMenu,
    SelectionDialog,
  },
  props: {
    modelValue: Object as () => JSONContent,
    note: { type: Object as () => Note, required: true },
  },
  emits: ["note:changed", "contextmenu:delete"],
  setup(props, { emit }) {
    const tagSelectOpen = ref(false);
    // maps a notes id to it's status
    const savingStatuses: Ref<Record<string, SaveStatus>> = ref({});

    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const features = useFeatures();

    const modals = ref({
      movetofolder: false,
    });

    // check features
    features.hasFeature(FEATURES.TAGS);

    const { editor, configureEditor, contentUpdated, editableNote } =
      useTextEditor();

    const title = ref("");
    const computedTitle = computed({
      get() {
        return title.value.split("/").slice(-1)[0];
      },
      set(t: string) {
        title.value = `${nodeItemPath(title.value)}/${t.replaceAll("/", "")}`;
      },
    });

    const { idle } = useIdle(10 * 1000);

    const checkEditable = (note: Note) => !note.is_archived && !note.is_trashed;

    const menu = computed((): MenuItem[] => [
      ...noteContextMenu(props.note, {
        onNoteEdited: (notes) => {
          emit("note:changed", notes[0]);
        },
      }),

      { id: Symbol(), type: "SEPARATOR" },
      {
        id: Symbol(),
        title: "Move into",
        icon: "FolderOpenIcon",
        action: () => {
          modals.value.movetofolder = true;
        },
      },
    ]);

    const saveStatus = computed(() => {
      const stat = savingStatuses.value[editableNote.value.id] ?? null;
      return stat;
    });

    watch(
      () => props.note,
      (currentPropNote: Note, oldPropNote: Note) => {
        if (editor.value) {
          editableNote.value = { ...currentPropNote };
          title.value = editableNote.value.title;

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

    const updateNote = async (
      updated_fields: Array<keyof NoteUpdate>,
      useStrictForTitle = true
    ) => {
      if (updated_fields.includes("title")) {
        let t = title.value.trim().slice(0, 60);
        if (useStrictForTitle) {
          if (t.startsWith("/")) t = t.slice(1) || "Untitled";
          if (t.endsWith("/")) t = `${t}Untitled`;
        } else {
          t = t || "Untitled";
        }
        editableNote.value.title = t;
      }

      const note = await notestore.updateNote(
        props.note,
        pickProperties(editableNote.value as NoteUpdate, updated_fields)
      );

      if (note) emit("note:changed", note);
      return note;
    };

    editableNote.value = props.note;
    title.value = editableNote.value.title;
    configureEditor();

    async function searchFolders(
      query?: string
    ): Promise<SearchedItem[] | null> {
      const folders: string[] = filePathTree<Note>(
        notestore.basicNotes,
        (n) => n.title
      )
        .filter(
          (i) =>
            i.type === "folder" &&
            i.title.toLowerCase().includes((query || "").toLowerCase())
        )
        .map((i) => i.title);

      if (folders.length === 0) return null;

      return [
        {
          title: "Root",
          group: "All Folders",
          icon: "FolderIcon",
          action: () => {
            let t = title.value;

            if (t.includes("/")) {
              t = t.split("/").slice(-1)[0];
            }

            title.value = t;
            updateNote(["title"], false);
          },
        },
        ...folders.map(
          (folder): SearchedItem => ({
            title: `${folder[0].toUpperCase()}${folder.slice(1)}`,
            icon: "FolderIcon",
            group: "All Folders",
            action: () => {
              let t = title.value;

              if (t.includes("/")) {
                t = `${folder}/${t.split("/").slice(-1)[0]}`;
              } else {
                t = `${folder}/${t}`;
              }

              title.value = t;
              updateNote(["title"], false);
            },
          })
        ),
      ];
    }

    function doCreateFolder(name: string) {
      let t = title.value;

      if (t.includes("/")) {
        t = `${name}/${t.split("/").slice(-1)[0]}`;
      } else {
        t = `${name}/${t}`;
      }

      title.value = t;
      updateNote(["title"], false);
    }

    return {
      features,
      FEATURES,
      saveStatus,
      contentUpdated,
      editableNote,
      title,
      updateNote,
      computedTitle,
      editor,
      saveNote,
      menu,
      authstore,
      notestore,
      modals,
      tagSelectOpen,
      doCreateFolder,
      searchFolders,
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
