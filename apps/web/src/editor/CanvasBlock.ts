import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import type { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import CanvasBlockView from './CanvasBlockView.vue'
import { canvasesOf } from './canvas/store'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvasBlock: { insertCanvas: () => ReturnType }
  }
}

export type CanvasBlockOptions = { ydoc: Y.Doc | null; provider: WebsocketProvider | null }

// FR-2.4: shapes live in the same Y.Doc (`canvases[canvasId]`), so prose and diagrams stay one document
// while each shape syncs and merges on its own.
export const CanvasBlock = Node.create<CanvasBlockOptions>({
  name: 'canvasBlock',
  group: 'block',
  atom: true,
  addOptions: () => ({ ydoc: null, provider: null }),
  addAttributes() {
    return {
      canvasId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-canvas-id'),
        renderHTML: (attrs) => ({ 'data-canvas-id': attrs.canvasId }),
      },
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-title') ?? '',
        renderHTML: (attrs) => (attrs.title ? { 'data-title': attrs.title } : {}),
      },
    }
  },
  addCommands() {
    return {
      // The inserting client creates the shape map up front, so no two clients race to create it.
      insertCanvas: () => ({ commands }) => {
        const canvasId = crypto.randomUUID()
        const ydoc = this.options.ydoc
        if (ydoc) ydoc.transact(() => canvasesOf(ydoc).set(canvasId, new Y.Map<Y.Map<unknown>>()))
        return commands.insertContent({ type: this.name, attrs: { canvasId } })
      },
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="canvas-block"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'canvas-block' })],
  // The canvas owns every event inside the block; ProseMirror must not intercept them.
  addNodeView: () => VueNodeViewRenderer(CanvasBlockView, { stopEvent: () => true }),
})
