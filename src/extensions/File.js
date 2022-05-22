import { Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import File from "@/components/texteditor/File.vue";

export default Node.create({
  name: "notebox-file",
  addNodeView: () => VueNodeViewRenderer(File),
  group: "block",
  addAttributes: () => ({
    url: {
      default: null,
    },
  }),
  parseHTML() {
    return [{ tag: "div" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      addFile:
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
});
