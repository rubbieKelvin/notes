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
            class="outline-0 w-full text-lg focus:outline-none"
            maxlength="60"
            @keypress.enter="() => updateNote(['title'])"
            @blur="() => updateNote(['title'])"
          />
          <p class="text-gray-500 text-sm">
            Last updated
            <UseTimeAgo
              v-slot="{ timeAgo }"
              :time="new Date(note.last_updated)"
            >
              {{ timeAgo }}
            </UseTimeAgo>
          </p>
        </div>

        <div class="flex gap-2 items-center">
          <button
            v-if="contentEdited"
            @click="saveNote"
            class="btn p-1 text-sm"
          >
            Changes made
          </button>
          <button
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
    <div class="texteditor-input">
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script lang="ts">
import {
  EditorContent,
  useEditor,
  BubbleMenu,
  JSONContent,
} from "@tiptap/vue-3";
import { UseTimeAgo } from "@vueuse/components";
import StaterKit from "@tiptap/starter-kit";
import { ref, defineComponent, Ref, watch, computed } from "vue";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Icon from "@/components/Icon";
import { Note, NoteUpdate } from "@/types/models";
import { onKeyStroke } from "@vueuse/core";
import { useNotesStore } from "@/stores/notes";
import { pickProperties } from "@/utils/helpers";
import { useIdle } from "@vueuse/core";
import { MenuItem } from "@/types";
import MenuList from "@/components/Popup/MenuList.vue";

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
  emits: ["note:changed"],
  setup(props, { emit }) {
    const notestore = useNotesStore();

    const contentEdited = ref(false);
    const { idle } = useIdle(5 * 1000);
    const editableNote = ref({ ...props.note });

    const menu = computed((): MenuItem[] => [
      { id: Symbol(), title: "Make public" },
      { id: Symbol(), title: "Share" },
      { id: Symbol(), title: "Export" },
      { id: Symbol(), title: "Delete" },
    ]);

    watch(
      () => props.note,
      () => {
        editableNote.value = { ...props.note };
        const editorCommands = editor.value?.commands;
        if (editorCommands)
          editorCommands.setContent(editableNote.value.content);
      }
    );

    watch(idle, async () => {
      await saveNote();
    });

    onKeyStroke(["Control", "s"], (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveNote();
      }
    });

    const saveNote = async () => {
      if (contentEdited.value) {
        const note = await updateNote(["content"]);
        if (note) contentEdited.value = false;
      }
    };

    const updateNote = async (updated_fields: Array<keyof NoteUpdate>) => {
      if (updated_fields.includes("title")) {
        let title = editableNote.value.title.trim().slice(0, 60) || "Untitled";
        editableNote.value.title = title;
      }

      const note = await notestore.updateNote(
        props.note,
        pickProperties(editableNote.value, updated_fields)
      );

      if (note) emit("note:changed", note);
      return note;
    };

    const editor = useEditor({
      extensions: [
        TaskList,
        TaskItem,
        Link.configure({
          autolink: true,
          linkOnPaste: true,
          openOnClick: true,
        }),
        StaterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({
          emptyEditorClass: "editor-empty",
          emptyNodeClass: "empty-node",
          placeholder: ({ node }) => {
            if (node.type.name === "heading") {
              if (node.attrs.level === 1)
                return "What's are we writing about?...";
              else if (node.attrs.level === 2)
                return "A Nice title under our main topic...";
              else node.attrs.level === 3;
              return "Let's discuss a point...";
            }

            return "Write Something...";
          },
        }),
      ],
      content: editableNote.value.content,
      onUpdate: () => {
        const content = editor?.value?.getJSON();
        if (
          content &&
          JSON.stringify(content) !== JSON.stringify(editableNote.value.content)
        ) {
          editableNote.value.content = content;
          contentEdited.value = true;
        }
      },
    });

    return { contentEdited, editableNote, updateNote, editor, saveNote, menu };
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
    @apply custom-scrollbar h-1 px-2;

    div {
      height: 100%;
    }
  }
}
</style>
