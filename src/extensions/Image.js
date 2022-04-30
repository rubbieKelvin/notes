import { Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import Image from "@/components/texteditor/Image.vue";

export default Node.create({
  name: "note-image",
  addNodeView() {
    return VueNodeViewRenderer(Image);
  },
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: {
        default:
          "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8bGFnb3N8ZW58MHx8MHx8&auto=format&fit=crop&w=900&q=60",
      },
      alt: {
          default: "Alternative text"
      }
    };
  },
  addCommands() {
    return {
      addImage:
        (options) =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          const node = this.type.create({
            ...options,
          });

          if (dispatch) tr.replaceRangeWith(selection.from, selection.to, node);
          return true;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-a": () => this.editor.commands.addImage(),
    };
  },
});
