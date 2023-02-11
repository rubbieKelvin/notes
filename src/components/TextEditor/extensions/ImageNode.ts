import { Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import ImageNode from "./nodeview/ImageNode.vue";

export interface ImageExtensionOptions {
  inline: boolean;
}

export interface ImageExtensionAttributes {
  title: string;
  row: boolean;
  compact: boolean;
  images:
    | {
        url: string;
        alt: string | null;
      }[]
    | null;
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
        default: true,
      },
      images: {
        default: null,
      },
    };
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
});
