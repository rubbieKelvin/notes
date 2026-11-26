import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import CanvasBlockView from './CanvasBlockView.vue'

// FR-2.4: the tldraw document snapshot lives in the node attrs, so prose + diagrams stay one document.
export const CanvasBlock = Node.create({
  name: 'canvasBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      snapshot: {
        default: null,
        parseHTML: (el) => JSON.parse(el.getAttribute('data-snapshot') ?? 'null'),
        renderHTML: (attrs) => ({ 'data-snapshot': JSON.stringify(attrs.snapshot) }),
      },
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="canvas-block"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'canvas-block' })],
  // tldraw owns every event inside the block; ProseMirror must not intercept them.
  addNodeView: () => VueNodeViewRenderer(CanvasBlockView, { stopEvent: () => true }),
})
