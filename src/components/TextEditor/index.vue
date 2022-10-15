<template>
  <div class="texteditor">
    <!-- heading -->
    <div class="texteditor-heading">
      <div class="flex">
        <div class="flex-grow py-2">
          <h1 class="font-medium text-xl">Heading</h1>
          <p class="text-gray-500 text-sm">by local, one week ago</p>
        </div>
        <div class="flex gap-2 items-center">
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
        class="btn flex items-center justify-center text-sm p-0.5 group"
        title="add tags"
      >
        <Icon name="PlusIcon" class="h-5 w-5" />
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
import { watch, ref, defineComponent } from "vue";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Icon from "@/components/Icon";

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
    Icon,
  },
  props: {
    modelValue: Object as () => JSONContent,
  },
  setup(props, ctx) {
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
      content: props.modelValue,
      onUpdate: () => {
        ctx.emit("update:modelValue", editor?.value?.getJSON());
      },
    });

    watch(
      () => props.modelValue,
      (value) => {
        if (
          JSON.stringify(editor?.value?.getJSON()) === JSON.stringify(value) ||
          !value
        )
          return;
        editor?.value?.commands.setContent(value, false);
      }
    );

    const tippyOptions = ref({
      duration: 100,
    });
    return { editor, tippyOptions };
  },
});
</script>

<style lang="scss" scoped>
.texteditor {
  display: flex;
  flex-direction: column;
  @apply gap-4;

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
    @apply custom-scrollbar h-1 px-1;

    div {
      height: 100%;
    }
  }
}
</style>
