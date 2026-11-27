import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
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
    open: { default: true, parseHTML: (el) => el.getAttribute('data-open') !== 'false', renderHTML: (a) => ({ 'data-open': String(a.open) }) },
  }),
  addCommands() {
    return { insertFile: (accept) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { accept } }) }
  },
  parseHTML: () => [{ tag: 'div[data-type="file-block"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-block' })],
  addNodeView: () => VueNodeViewRenderer(FileBlockView),
})
