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
            @keypress.enter="saveNoteName"
            @blur="saveNoteName"
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
          <button v-if="unsaved" class="btn p-1 text-sm">Changes made</button>
          <button class="btn p-1 h-min">
            <Icon name="StarIcon" class="w-5 h-5" />
          </button>
          <button class="btn p-1 h-min">
            <Icon class="w-5 h-5" name="EllipsisVerticalIcon" />
          </button>
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
      <!-- <editor-content :editor="editor" /> -->
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
import { ref, defineComponent, Ref, watch } from "vue";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Icon from "@/components/Icon";
import { useToasts } from "@/utils/toasts";
import { Note } from "@/types/models";
import { useNotesManager } from "@/utils/api/notes";
import { useRouter } from "vue-router";
import { useNotesStore } from "@/stores/notes";

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
    Icon,
    UseTimeAgo,
  },
  props: {
    modelValue: Object as () => JSONContent,
    note: { type: Object as () => Note, required: true },
  },
  emits: ["note:changed"],
  setup(props, { emit }) {
    const notestore = useNotesStore();

    const unsaved = ref(false);
    const editableNote = ref({ ...props.note });

    watch(
      () => props.note,
      () => {
        editableNote.value = { ...props.note };
      }
    );

    const saveNoteName = async () => {
      let title = editableNote.value.title.trim().slice(0, 60) || "Untitled";
      editableNote.value.title = title;

      const note = await notestore.updateNote(props.note, {
        title: editableNote.value.title,
      });

      if (note) emit("note:changed", note);
    };

    // const router = useRouter();
    // const { updateNote } = useNotesManager();
    // const { addToast, removeToast } = useToasts();

    // const tippyOptions = ref({
    //   duration: 100,
    // });

    // const current: Ref<{ heading: string; content: JSONContent }> = ref({
    //   heading: props.note.title,
    //   content: props.note.content,
    // });

    // const editor = useEditor({
    //   extensions: [
    //     TaskList,
    //     TaskItem,
    //     Link.configure({
    //       autolink: true,
    //       linkOnPaste: true,
    //       openOnClick: true,
    //     }),
    //     StaterKit.configure({ heading: { levels: [1, 2, 3] } }),
    //     Placeholder.configure({
    //       emptyEditorClass: "editor-empty",
    //       emptyNodeClass: "empty-node",
    //       placeholder: ({ node }) => {
    //         if (node.type.name === "heading") {
    //           if (node.attrs.level === 1)
    //             return "What's are we writing about?...";
    //           else if (node.attrs.level === 2)
    //             return "A Nice title under our main topic...";
    //           else node.attrs.level === 3;
    //           return "Let's discuss a point...";
    //         }

    //         return "Write Something...";
    //       },
    //     }),
    //   ],
    //   content: current.value.content,
    //   onUpdate: () => {
    //     const content = editor?.value?.getJSON();
    //     if (content) current.value.content = content;
    //   },
    // });

    // async function save() {
    //   unsaved.value = false;

    //   const toast = addToast({
    //     id: Symbol(),
    //     title: "Saving note",
    //     desciption: `saving ${current.value.heading} to local`,
    //   });

    //   // find note's index in ctx
    //   await updateNote(props.note.id, {
    //     title: current.value.heading,
    //     content: current.value.content,
    //   });

    //   setTimeout(() => removeToast(toast.id), 3000);
    // }

    return { unsaved, editableNote, saveNoteName };
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
