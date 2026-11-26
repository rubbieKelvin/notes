import { Mark, mergeAttributes, type Editor } from '@tiptap/core'
import { reactive } from 'vue'

export type Whisper = { id: string; note: string; agent: string; from: number; to: number; text: string }

// Transient request state; never written into the document.
export const pending = reactive(new Set<string>())
export const failed = reactive(new Map<string, string>())

// FR-1.1: the whisper lives on a mark around the highlighted span, so ProseMirror (and later Yjs)
// keeps it anchored through edits above, below and around it.
export const AiMargin = Mark.create({
  name: 'aiMargin',
  inclusive: false,
  addAttributes: () => ({
    id: { default: null, parseHTML: (el) => el.getAttribute('data-whisper-id'), renderHTML: (a) => ({ 'data-whisper-id': a.id }) },
    note: { default: '', parseHTML: (el) => el.getAttribute('data-note') ?? '', renderHTML: (a) => ({ 'data-note': a.note }) },
    agent: { default: '', parseHTML: (el) => el.getAttribute('data-agent') ?? '', renderHTML: (a) => ({ 'data-agent': a.agent }) },
  }),
  parseHTML: () => [{ tag: 'span[data-whisper-id]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'ai-margin' }), 0],
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => requestWhisper(this.editor),
      Escape: () => {
        const id = this.editor.isActive('aiMargin') && this.editor.getAttributes('aiMargin').id
        return id ? (setWhisper(this.editor, id, null), true) : false
      },
    }
  },
})

export function listWhispers(editor: Editor): Whisper[] {
  const byId = new Map<string, Whisper>()
  editor.state.doc.descendants((node, pos) => {
    const m = node.marks.find((m) => m.type.name === 'aiMargin')
    if (!m || !node.isText) return
    const w = byId.get(m.attrs.id)
    if (w) { w.to = pos + node.nodeSize; w.text += node.text }
    else byId.set(m.attrs.id, { id: m.attrs.id, note: m.attrs.note, agent: m.attrs.agent, from: pos, to: pos + node.nodeSize, text: node.text ?? '' })
  })
  return [...byId.values()]
}

/** Update a whisper's attrs, or remove it entirely (null) leaving no trace. */
export function setWhisper(editor: Editor, id: string, attrs: { note: string; agent: string } | null, history = true) {
  const w = listWhispers(editor).find((w) => w.id === id)
  if (!w) return
  const type = editor.schema.marks.aiMargin
  const tr = editor.state.tr.removeMark(w.from, w.to, type)
  if (attrs) tr.addMark(w.from, w.to, type.create({ id, ...attrs }))
  if (!history) tr.setMeta('addToHistory', false)
  editor.view.dispatch(tr)
  failed.delete(id)
}

export function requestWhisper(editor: Editor) {
  const { to, empty } = editor.state.selection
  if (empty || editor.isActive('aiMargin')) return false
  const id = crypto.randomUUID()
  editor.chain().setMark('aiMargin', { id, note: '', agent: '' }).setTextSelection(to).run()
  void fetchNote(editor, id)
  return true
}

export async function fetchNote(editor: Editor, id: string) {
  const w = listWhispers(editor).find((w) => w.id === id)
  if (!w) return
  pending.add(id)
  failed.delete(id)
  try {
    const res = await fetch('/v1/whisper', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: w.text, context: editor.state.doc.resolve(w.from).parent.textContent }),
    })
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
    const { note, agent_id } = await res.json()
    setWhisper(editor, id, { note, agent: agent_id }, false)
  } catch (e) {
    failed.set(id, e instanceof Error ? e.message : String(e))
  } finally {
    pending.delete(id)
  }
}

/** FR-1.3 "Insert Below as Quote": promote the note into the flow as an attributed block. */
export function promoteWhisper(editor: Editor, id: string) {
  const w = listWhispers(editor).find((w) => w.id === id)
  if (!w?.note) return
  const after = editor.state.doc.resolve(w.to).after(1)
  setWhisper(editor, id, null)
  editor.chain().insertContentAt(after, {
    type: 'aiSource', attrs: { agent: w.agent, provenance: 'ai_agent' },
    content: [{ type: 'paragraph', content: [{ type: 'text', text: w.note }] }],
  }).run()
}
