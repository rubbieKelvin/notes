<template>
  <div class="texteditor">
    <!-- heading -->
    <div class="texteditor-heading">
      <div class="flex">
        <div class="flex-grow py-2">
          <input type="text" v-model="current.heading" />
          <p class="text-gray-500 text-sm">by local, one week ago</p>
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
    <div class="texteditor-tags">
      <button
        class="btn flex items-center justify-center text-sm py-0.5 px-1 group"
        title="add tags"
      >
        <Icon name="PlusIcon" class="h-5 w-5" />
        <span class="text-sm">Tags</span>
      </button>
    </div>

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
import StaterKit from "@tiptap/starter-kit";
import { watch, ref, defineComponent, onMounted, onUnmounted, Ref } from "vue";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Icon from "@/components/Icon";
import useKeybinding from "@/plugins/shortcuts/useKeybinding";
import { useToasts } from "@/utils/toasts";
import { Note } from "@/types/models";
import { provideContext } from "@/plugins/context";
import { useNotesManager } from "@/utils/api/notes";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
    Icon,
  },
  props: {
    modelValue: Object as () => JSONContent,
    note: { type: Object as () => Note, required: true },
  },
  setup(props) {
    const ctx = provideContext();

    const keybindings = useKeybinding("editor");
    const unsaved = ref(false);

    const router = useRouter();
    const { updateNote } = useNotesManager();
    const { addToast, removeToast } = useToasts();

    function changesMade() {
      return (
        current.value.heading !== ctx.value.note?.title ||
        JSON.stringify(current.value.content) !==
          JSON.stringify(ctx.value.note?.content)
      );
    }

    const tippyOptions = ref({
      duration: 100,
    });

    const current: Ref<{ heading: string; content: JSONContent }> = ref({
      heading: props.note.title,
      content: props.note.content,
    });

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
      content: current.value.content,
      onUpdate: () => {
        const content = editor?.value?.getJSON();
        if (content) current.value.content = content;
      },
    });

    async function save() {
      if (!changesMade()) return;

      unsaved.value = false;

      const toast = addToast({
        id: Symbol(),
        title: "Saving note",
        desciption: `saving ${current.value.heading} to local`,
      });

      // find note's index in ctx
      await updateNote(props.note.id, {
        title: current.value.heading,
        content: current.value.content,
      });

      setTimeout(() => removeToast(toast.id), 3000);
    }

    onMounted(() => {
      keybindings.bind("savenote", "control+s", () => {
        save();
      });

      keybindings.bind("closenote", "escape", () => {
        ctx.value.note = null;
        router.push({ name: "Notes" });
      });
    });

    onUnmounted(() => {
      keybindings.unbind();
    });

    watch(
      () => current.value.heading,
      () => {
        unsaved.value = changesMade();
      }
    );

    watch(
      () => ctx.value.note,
      (note) => {
        if (note === null) {
          current.value.heading = "";
          current.value.content = {};
        } else {
          unsaved.value = changesMade();
          current.value.heading = note.title;
          current.value.content = note.content;
        }
      }
    );

    watch(
      () => current.value.content,
      (value) => {
        unsaved.value = changesMade();

        if (
          JSON.stringify(editor?.value?.getJSON()) === JSON.stringify(value) ||
          !value
        )
          return;
        editor?.value?.commands.setContent(value, false);
      }
    );

    return { editor, tippyOptions, current, save, unsaved };
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
