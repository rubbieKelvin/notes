import { useEditor } from "@tiptap/vue-3";

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

export default () => {
  const { isPublicNotePage } = useUtils();

  let shalloweditor: ShallowRef<Editor | undefined> = shallowRef();
  const editor: Ref<Editor | undefined> = ref();

  const contentUpdated = ref(false);

  const isEditable = (note: Note): boolean => {
    return !note.is_archived && !note.is_trashed && !isPublicNotePage.value;
  };

  const configureEditor = (
    note: Ref<Note>,
    setContentOnUpdate: boolean = true
  ) => {
    contentUpdated.value = false;

    if (editor.value) {
      // update instead
      // ...

      if (setContentOnUpdate) {
        editor.value.setEditable(true);
        editor.value.commands.setContent(note.value.content);
      }

      editor.value.setEditable(isEditable(note.value));
      return editor;
    }

    shalloweditor = useEditor({
      editable: isEditable(note.value),
      extensions: [
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
        CodeBlock.configure({ lowlight }),
      ],
      content: note.value.content,
      onUpdate: () => {
        const content = shalloweditor?.value?.getJSON();
        if (
          shalloweditor.value &&
          content &&
          JSON.stringify(content) !== JSON.stringify(note.value.content)
        ) {
          note.value.content = content;
          contentUpdated.value = true;
        }
      },
    });

    watchOnce(shalloweditor, (value) => {
      console.log("editor value changed");
      editor.value = value;
    });

    return shalloweditor;
  };

  return {
    editor,
    configureEditor,
    isEditable,
    contentUpdated,
  };
};
