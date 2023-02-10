<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100 }"
  >
    <div
      class="bg-themed-bg rounded-md border border-themed-stroke p-1 shadow-md flex w-fit"
    >
      <template v-for="item in menu">
        <button
          v-if="!item.disabled"
          class="p-2 hover:bg-themed-hover-bg rounded-md"
          :title="item.title"
          :key="item.title"
          :class="{ ' text-themed-accent-bg': editor.isActive(item.title) }"
          @click="item.action"
        >
          <mdi-icon :path="item.iconPath" class="w-5 h-5" />
        </button>
      </template>
    </div>
  </bubble-menu>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Editor, BubbleMenu } from "@tiptap/vue-3";
import MdiIcon from "@/components/MdiIcon.vue";
import {
  mdiCodeBraces,
  mdiCodeTags,
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatListBulleted,
  mdiFormatListCheckbox,
  mdiFormatQuoteOpen,
  mdiFormatStrikethrough,
  mdiFormatSubscript,
  mdiFormatSuperscript,
  mdiFormatUnderline,
} from "@mdi/js";

interface FloatingMenuItem {
  title: string;
  iconPath: string;
  action: () => any;
  disabled?: boolean;
}

export default defineComponent({
  name: "FloatingMenu",
  props: {
    editor: { type: Editor, required: true },
  },
  components: { BubbleMenu, MdiIcon },
  setup(props) {
    const menu: Array<FloatingMenuItem> = [
      {
        title: "bold",
        iconPath: mdiFormatBold,
        action: () => props.editor.chain().focus().toggleBold().run(),
      },
      {
        title: "blockquote",
        iconPath: mdiFormatQuoteOpen,
        action: () => props.editor.chain().focus().toggleBlockquote().run(),
      },
      {
        title: "italic",
        iconPath: mdiFormatItalic,
        action: () => props.editor.chain().focus().toggleItalic().run(),
      },
      {
        title: "code",
        iconPath: mdiCodeTags,
        action: () => props.editor.chain().focus().toggleCode().run(),
      },
      {
        title: "bulletlist",
        iconPath: mdiFormatListBulleted,
        action: () => props.editor.chain().focus().toggleBulletList().run(),
      },
      {
        title: "strike",
        iconPath: mdiFormatStrikethrough,
        action: () => props.editor.chain().focus().toggleStrike().run(),
      },
      {
        title: "tasklist",
        iconPath: mdiFormatListCheckbox,
        action: () => props.editor.chain().focus().toggleTaskList().run(),
      },
      {
        title: "codeblock",
        iconPath: mdiCodeBraces,
        action: () => props.editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        title: "subscript",
        iconPath: mdiFormatSubscript,
        action: () => props.editor.chain().focus().toggleSubscript().run(),
      },
      {
        title: "superscript",
        iconPath: mdiFormatSuperscript,
        action: () => props.editor.chain().focus().toggleSuperscript().run(),
      },
      {
        title: "underline",
        iconPath: mdiFormatUnderline,
        action: () => props.editor.chain().focus().toggleUnderline().run(),
      },
    ];
    return { menu };
  },
});
</script>
