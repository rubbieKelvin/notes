import { JSONContent, useEditor } from "@tiptap/vue-3";

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
import { watchOnce } from "@vueuse/core";
import { generateHTML } from "@tiptap/vue-3";

const extensions = [
  TaskList,
  TaskItem,
  Link.configure({
    autolink: true,
    linkOnPaste: true,
    openOnClick: true,
  }),
  StaterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
  }),
  Placeholder.configure({
    emptyEditorClass: "editor-empty",
    emptyNodeClass: "empty-node",
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        if (node.attrs.level === 1) return "What's are we writing about?...";
        else if (node.attrs.level === 2)
          return "A Nice title under our main topic...";
        else node.attrs.level === 3;
        return "Let's discuss a point...";
      }

      return "Write Something...";
    },
  }),
  CodeBlock.configure({ lowlight }),
];

export default (defaultNote: Note) => {
  const { isPublicNotePage } = useUtils();

  let shalloweditor: ShallowRef<Editor | undefined> = shallowRef();
  const editor: Ref<Editor | undefined> = ref();
  const editableNote: Ref<Note> = ref({ ...defaultNote });
  const contentUpdated = ref(false);

  function isEditable(note: Note): boolean {
    return !note.is_archived && !note.is_trashed && !isPublicNotePage.value;
  }

  function onUpdate() {
    if (editor.value) {
      const content = editor.value.getJSON();

      if (
        editor.value.getHTML() !==
        generateHTML(editableNote.value.content, extensions)
      ) {
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
      content: editableNote.value.content,
    });

    watchOnce(shalloweditor, (value) => {
      editor.value = value;
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
};
