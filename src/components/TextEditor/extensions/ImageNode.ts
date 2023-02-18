import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import ImageNode from "./nodeview/ImageNode.vue";

export interface ImageExtensionOptions {
  inline: boolean;
}

export interface StructuredImageData {
  uploadID: string;
  url: string | null;
  alt: string | null;
}

export interface ImageExtensionAttributes {
  image: StructuredImageData;
}

export const ImageExtension = Node.create<ImageExtensionOptions>({
  name: "imageNode",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      inline: false,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  addAttributes(): Record<keyof ImageExtensionAttributes, { default: any }> {
    return {
      image: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "opennotes-imagenode" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "opennotes-imagenode",
      mergeAttributes({
        ...HTMLAttributes,
        image: JSON.stringify(HTMLAttributes.image),
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageNode);
  },
});
