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
  title: string;
  row: boolean;
  compact: boolean;
  images: StructuredImageData[] | null;
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
      title: {
        default: "Images",
      },
      row: {
        default: true,
      },
      compact: {
        default: false,
      },
      images: {
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
        images: JSON.stringify(HTMLAttributes.images),
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageNode);
  },
});
