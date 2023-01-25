import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import Component from "@/components/TextEditor/extensions/nodeview/CodeBlock.vue";

export default CodeBlockLowlight.extend({
  addNodeView() {
    return VueNodeViewRenderer(Component);
  },
});
