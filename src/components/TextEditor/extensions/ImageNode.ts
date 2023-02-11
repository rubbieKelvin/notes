// import { Node } from "@tiptap/core";
// import { VueNodeViewRenderer } from "@tiptap/vue-3";
// import ImageNode from "./nodeview/ImageNode.vue";

// // export interface ImageUploadOptions {
// //   upload(file: File): Promise<string>;
// // }

// export const ImageExtension = Node.create({
//   name: "imageNode",
//   group: 'block',
//   addNodeView() {
//     return VueNodeViewRenderer(ImageNode);
//   },
// });

import { Node, nodeInputRule } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import ImageNode from "./nodeview/ImageNode.vue";

export interface ImagePlaceholderOptions {
  inline: boolean;
  HTMLAttributes: Record<string, any>;
}

export const inputRegex =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const ImageExtension = Node.create<ImagePlaceholderOptions>({
  name: "imageNode",
  draggable: false,

  addOptions() {
    return {
      inline: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "image-placeholder" }];
  },

  renderHTML() {
    return ["div"];
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageNode);
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        // getAttributes: (match) => {
        //   const [, , uploadId] = match;

        //   return { uploadId };
        // },
      }),
    ];
  },
});
