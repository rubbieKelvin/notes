import { FileText } from '@lucide/vue'
import { Node } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import { VueRenderer, type Editor as VueEditor } from '@tiptap/vue-3'
import { markRaw } from 'vue'
import type { SlashItem } from './SlashCommand'
import SlashMenu from './SlashMenu.vue'

export type NoteRefOptions = {
  /** Notes the reader can open, for the [[ picker and current titles. */
  notes: () => { id: string; title: string }[]
}

const icon = markRaw(FileText)
const key = new PluginKey('noteRefSuggestion') // the slash menu owns the default key

/**
 * [[ links another note inline. The title is saved with the link, so readers who can't open that note
 * still see what it was called; for notes the reader can open, the current title shows instead.
 */
export const NoteRef = Node.create<NoteRefOptions>({
  name: 'noteRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({ notes: () => [] }),
  addAttributes: () => ({
    noteId: { default: null, parseHTML: (el) => el.getAttribute('data-note-ref'), renderHTML: () => ({}) },
    title: { default: '', parseHTML: (el) => el.textContent ?? '', renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: 'a[data-note-ref]' }],
  renderHTML: ({ node }) => ['a', { href: `/d/${node.attrs.noteId}`, 'data-note-ref': node.attrs.noteId, class: 'note-ref' }, node.attrs.title || 'Untitled'],
  renderText: ({ node }) => `[[${node.attrs.title}]]`,
  addNodeView() {
    return ({ node }) => {
      const a = document.createElement('a')
      a.href = `/d/${node.attrs.noteId}`
      a.className = 'note-ref'
      a.dataset.noteRef = node.attrs.noteId
      a.contentEditable = 'false' // so a click follows the link even in an editable note
      a.textContent = this.options.notes().find((n) => n.id === node.attrs.noteId)?.title || node.attrs.title || 'Untitled'
      return { dom: a }
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: key,
        char: '[[',
        allowSpaces: true,
        items: ({ query }) => {
          const q = query.toLowerCase().trim()
          return this.options.notes()
            .filter((n) => (n.title || 'Untitled').toLowerCase().includes(q))
            .slice(0, 20)
            .map((n) => ({
              group: 'Notes', title: n.title || 'Untitled', description: '', icon,
              run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: 'noteRef', attrs: { noteId: n.id, title: n.title } }, { type: 'text', text: ' ' }]).run(),
            }) satisfies SlashItem)
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let menu: VueRenderer | undefined
          let unmount: (() => void) | undefined
          return {
            onStart: (props) => {
              menu = new VueRenderer(SlashMenu, { props: { ...props, label: 'Link a note' }, editor: props.editor as VueEditor })
              unmount = props.mount(menu.element as HTMLElement)
            },
            onUpdate: (props) => menu?.updateProps({ ...props, label: 'Link a note' }),
            onKeyDown: ({ event, view }) => event.key === 'Escape' ? (exitSuggestion(view, key), true) : menu?.ref?.onKeyDown(event) ?? false,
            onExit: () => { unmount?.(); menu?.destroy() },
          }
        },
      }),
    ]
  },
})
