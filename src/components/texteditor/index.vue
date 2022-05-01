<template>
  <div class="root">
    <bubble-menu
      :editor="editor"
      v-if="editor"
      :tippy-options="{ duration: 100 }"
    >
      <SelectMenu :editor="editor" />
    </bubble-menu>
    <editor-content :editor="editor" />
  </div>
</template>

<style lang="scss" scoped>
.root {
  height: 0;
  overflow-y: auto;
  @apply custom-scrollbar;

  div {
    height: 100%;
  }
}

.floating {
  pointer-events: all;
  @apply flex gap-2 bg-gray-50 rounded-md p-1 mt-12 -ml-3;

  button {
    @apply hover:bg-gray-200 text-sm p-1 rounded-md;
  }
}
</style>

<script>
import { EditorContent, useEditor, BubbleMenu } from "@tiptap/vue-3";
import StaterKit from "@tiptap/starter-kit";
import { watch, ref } from "@vue/runtime-core";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@/extensions/Image";
import Link from "@tiptap/extension-link";
import SelectMenu from "./SelectMenu.vue";
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

export default {
  name: "TextEditor",
  components: {
    EditorContent,
    BubbleMenu,
    SelectMenu,
  },
  props: {
    modelValue: Object,
  },
  setup(props, ctx) {
    const editor = useEditor({
      extensions: [
        Image,
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
        ctx.emit("update:modelValue", editor.value.getJSON());
      },
    });

    watch(
      () => props.modelValue,
      (value) => {
        if (JSON.stringify(editor.value.getJSON()) === JSON.stringify(value))
          return;
        editor.value.commands.setContent(value, false);
      }
    );

    const tippyOptions = ref({
      duration: 100,
    });
    return { editor, tippyOptions };
  },
};
</script>
