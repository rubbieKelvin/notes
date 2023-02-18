import {
  mergeAttributes,
  textblockTypeInputRule,
  useEditor,
} from "@tiptap/vue-3";

import StaterKit from "@tiptap/starter-kit";
import { ShallowRef, Ref, shallowRef, ref } from "vue";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Note } from "@/types/models";
import CodeBlock from "@/components/TextEditor/extensions/CodeBlock";
import { lowlight } from "lowlight/lib/common";
import useUtils from "@/composables/useUtils";
import { Editor } from "@tiptap/vue-3";
import { createSharedComposable, watchOnce } from "@vueuse/core";
import { generateHTML } from "@tiptap/vue-3";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Underline } from "@tiptap/extension-underline";
import { DropHandler } from "@/components/TextEditor/extensions/DropHandler";
import { ImageExtension } from "@/components/TextEditor/extensions/ImageNode";
import { Heading } from "@tiptap/extension-heading";
import { v4 as uuid4 } from "uuid";

export const extensions = [
  TaskList,
  TaskItem,
  Superscript,
  Subscript,
  Underline,
  DropHandler,
  ImageExtension,
  Link.configure({
    autolink: true,
    linkOnPaste: true,
    openOnClick: true,
  }),
  Heading.extend({
    renderHTML({ node, HTMLAttributes }) {
      const hasLevel = this.options.levels.includes(node.attrs.level);
      const level = hasLevel ? node.attrs.level : this.options.levels[0];

      return [
        `h${level}`,
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          id: uuid4(),
        }),
        0,
      ];
    },
  }).configure({ levels: [1, 2, 3] }),
  StaterKit.configure({
    // heading: { levels: [1, 2, 3] },
    codeBlock: false,
    dropcursor: { color: "#ff0000" },
    heading: false,
  }),
  Placeholder.configure({
    emptyEditorClass: "editor-empty",
    emptyNodeClass: "empty-node",
    placeholder: ({ node }) => {
      if (node.type.name === "heading")
        return "What's are we writing about?...";
      return "Write Something...";
    },
  }),
  CodeBlock.configure({ lowlight }),
];

export default createSharedComposable(() => {
  const { isPublicNotePage } = useUtils();

  let shalloweditor: ShallowRef<Editor | undefined> = shallowRef();
  const editor: Ref<Editor | undefined> = ref();
  const editableNote: Ref<Note> = ref({
    id: "",
    content: { type: "doc" },
  } as Note);
  const contentUpdated = ref(false);

  function isEditable(note: Note): boolean {
    return !note.is_archived && !note.is_trashed && !isPublicNotePage.value;
  }

  function onUpdate() {
    if (editor.value) {
      const content = editor.value.getJSON();
      const similarContent =
        editor.value.getHTML() ===
        generateHTML(editableNote.value.content, extensions);

      if (!similarContent) {
        editableNote.value.content = content;
        contentUpdated.value = true;
      }
    }
  }

  function configureEditor(setContentOnUpdate: boolean = true) {
    contentUpdated.value = false;

    if (editor.value) {
      // update instead
      // ...

      if (setContentOnUpdate) {
        editor.value.off("update", onUpdate);
        editor.value.setEditable(true);
        editor.value.commands.setContent(editableNote.value.content);
        editor.value.on("update", onUpdate);
      }

      editor.value.setEditable(isEditable(editableNote.value));
      return editor;
    }

    shalloweditor = useEditor({
      editable: isEditable(editableNote.value),
      extensions,
    });

    watchOnce(shalloweditor, (value) => {
      editor.value = value;

      if (!editor.value) return;
      editor.value?.commands.setContent(editableNote.value.content);
      editor.value?.on("update", onUpdate);
    });

    return shalloweditor;
  }

  return {
    editor,
    editableNote,
    configureEditor,
    isEditable,
    contentUpdated,
  };
});
