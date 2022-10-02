<template>
  <div class="texteditor">
    <editor-content :editor="editor" />
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

export default defineComponent({
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
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
  overflow-y: auto;
  @apply custom-scrollbar px-10;

  div {
    height: 100%;
  }
}
</style>
