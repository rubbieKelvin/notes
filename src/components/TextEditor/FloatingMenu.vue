<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, zIndex: 9000 }"
  >
    <div
      class="bg-themed-bg rounded-md border border-themed-stroke p-1 shadow-md flex w-fit"
    >
      <template v-for="(item, index) in menu">
        <div
          v-if="item.isdivider"
          :key="index"
          class="w-[1px] bg-themed-stroke h-full"
        />
        <button
          v-else-if="item.title && item.iconPath && !item.disabled"
          class="p-2 hover:bg-themed-hover-bg rounded-md"
          :title="item.title"
          :key="item.title"
          :class="{
            ' text-themed-accent-bg': item.isActive
              ? item.isActive()
              : editor.isActive(item.title),
          }"
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
  mdiFormatHeader1,
  mdiFormatHeader2,
  mdiFormatHeader3,
  mdiFormatItalic,
  mdiFormatListBulleted,
  mdiFormatListCheckbox,
  mdiFormatQuoteOpen,
  mdiFormatStrikethrough,
  mdiFormatSubscript,
  mdiFormatSuperscript,
  mdiFormatUnderline,
} from "@mdi/js";
import { Level } from "@tiptap/extension-heading";

interface FloatingMenuItem {
  title?: string;
  iconPath?: string;
  action?: () => any;
  disabled?: boolean;
  isdivider?: boolean;
  isActive?: () => boolean;
}

const divider = (): FloatingMenuItem => ({ isdivider: true });

export default defineComponent({
  name: "FloatingMenu",
  props: {
    editor: { type: Editor, required: true },
  },
  components: { BubbleMenu, MdiIcon },
  setup(props) {
    const menu: Array<FloatingMenuItem> = [
      ...([1, 2, 3] as Array<Level>).map((level) => ({
        title: `heading-${level}`,
        iconPath: [mdiFormatHeader1, mdiFormatHeader2, mdiFormatHeader3][
          level - 1
        ],
        action: () =>
          props.editor.chain().focus().toggleHeading({ level }).run(),
        isActive: () => props.editor.isActive("heading", { level }),
      })),
      divider(),
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
