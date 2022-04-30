<template>
  <editor-content :editor="editor" />
</template>

<script>
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StaterKit from "@tiptap/starter-kit";
import { watch } from "@vue/runtime-core";
import Placeholder from "@tiptap/extension-placeholder";

export default {
  name: "TextEditor",
  components: {
    EditorContent,
  },
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  setup(props, ctx) {
    const editor = useEditor({
      extensions: [
        StaterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({
          emptyEditorClass: "editor-empty",
          emptyNodeClass: "empty-node",
          placeholder: ({ node }) => {
              console.log(node)
            if (node.type.name === "heading") {
                if (node.attrs.level === 1 )
                    return "What's are we writing about?...";
                else if (node.attrs.level === 2)
                    return "A Nice title under our main topic..."
                else (node.attrs.level === 3)
                    return "Let's discuss a point..."
            }

            return "Write Something...";
          },
        }),
      ],
      content: props.modelValue,
      onUpdate: () => {
        ctx.emit("update:modelValue", editor.value.getHTML());
      },
    });

    watch(
      () => props.modelValue,
      (value) => {
        if (editor.value.getHTML() === value) return;
        editor.value.commands.setContent(value, false);
      }
    );
    return { editor };
  },
};
</script>
