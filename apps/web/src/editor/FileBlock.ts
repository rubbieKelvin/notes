import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import { NodeSelection, Plugin } from '@tiptap/pm/state'
import { pendingUploads } from '../files'
import FileBlockView from './FileBlockView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileBlock: { insertFile: (accept: string) => ReturnType }
  }
}

export type FileBlockOptions = { docId: string; readOnly: boolean }

const attr = (name: string, fallback: string | number | boolean | null) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (a: Record<string, unknown>) => (a[name] == null ? {} : { [`data-${name}`]: a[name] }),
})

/**
 * /file, /image, /video, /audio, /pdf: an uploaded file with a preview. Without `fileId` it's the upload slot,
 * which takes a new upload or a file already in your storage (the same file can sit in many notes).
 * The server reads `fileId` from saved notes to know which notes show which file.
 */
export const FileBlock = Node.create<FileBlockOptions>({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions: () => ({ docId: '', readOnly: false }),
  addAttributes: () => ({
    fileId: attr('file-id', null),
    name: attr('name', ''),
    mime: attr('mime', ''),
    size: attr('size', 0),
    accept: attr('accept', 'file'),
    // set while this tab uploads a dropped or pasted file into the block
    upload: { default: null, rendered: false },
    open: { default: true, parseHTML: (el) => el.getAttribute('data-open') !== 'false', renderHTML: (a) => ({ 'data-open': String(a.open) }) },
  }),
  addCommands() {
    return { insertFile: (accept) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { accept } }) }
  },
  // Dropped or pasted files become file blocks that upload themselves.
  addProseMirrorPlugins() {
    if (this.options.readOnly) return []
    const blocks = (files: File[]) => files.map((f) => {
      const upload = crypto.randomUUID()
      pendingUploads.set(upload, f)
      return { type: this.name, attrs: { upload, name: f.name } }
    })
    return [new Plugin({
      props: {
        handleDrop: (view, event, _slice, moved) => {
          const files = [...(event.dataTransfer?.files ?? [])]
          if (moved || !files.length) return false
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.to
          this.editor.chain().focus().insertContentAt(pos, blocks(files)).run()
          return true
        },
        handlePaste: (_view, event) => {
          const files = [...(event.clipboardData?.files ?? [])]
          // Office apps put a picture of copied text on the clipboard too: that's a text paste.
          if (!files.length || event.clipboardData?.getData('text/plain')) return false
          // after a selected block (say, the file just dropped), never in place of it
          const sel = this.editor.state.selection
          this.editor.chain().focus().insertContentAt(sel instanceof NodeSelection ? sel.to : sel, blocks(files)).run()
          return true
        },
      },
    })]
  },
  parseHTML: () => [{ tag: 'div[data-type="file-block"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-block' })],
  addNodeView: () => VueNodeViewRenderer(FileBlockView),
})
