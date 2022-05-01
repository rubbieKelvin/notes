<template>
  <div class="root">
    <floating-menu
      class="float-container"
      :editor="editor"
      v-if="editor"
      :tippy-options="tippyOptions"
    >
      <div class="floating">
        <button
          v-for="menu in TIPPY_MENU"
          :key="menu.name"
          @click="menu.callback(editor)"
        >
          {{ menu.name }}
        </button>
      </div>
    </floating-menu>
    <editor-content :editor="editor" />
  </div>
</template>

<style lang="scss" scoped>
.root,
.root > div {
  height: 100%;
}

.floating {
  pointer-events: all;
  @apply flex gap-2 bg-gray-50 rounded-md p-1 mt-20 -ml-3;

  button {
    @apply hover:bg-gray-200 text-sm p-1 rounded-md;
  }
}
</style>

<script>
import { EditorContent, useEditor, FloatingMenu } from "@tiptap/vue-3";
import StaterKit from "@tiptap/starter-kit";
import { watch, ref } from "@vue/runtime-core";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@/extensions/Image";
import { TIPPY_MENU } from "@/constants/menu";

export default {
  name: "TextEditor",
  components: {
    EditorContent,
    FloatingMenu,
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
        Image,
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

    const tippyOptions = ref({
      duration: 100,
    });
    return { editor, tippyOptions, TIPPY_MENU };
  },
};
</script>
