import { FileText } from '@lucide/vue'
import { Node } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import { VueRenderer, type Editor as VueEditor } from '@tiptap/vue-3'
import { markRaw } from 'vue'
import { api } from '../api'
import type { Tab } from './tabs'
import type { SlashItem } from './SlashCommand'
import SlashMenu from './SlashMenu.vue'

export type NoteRefOptions = {
  /** Notes the reader can open, for the [[ picker and current titles. */
  notes: () => { id: string; title: string }[]
}

const icon = markRaw(FileText)
const key = new PluginKey('noteRefSuggestion') // the slash menu owns the default key

// shortcut: a note's tabs are fetched once per page load, so tabs added since won't show until a reload
const tabCache = new Map<string, Promise<Tab[]>>()
const tabsOf = (id: string) => {
  if (!tabCache.has(id)) tabCache.set(id, api<Tab[]>(`/v1/docs/${id}/tabs`).catch(() => []))
  return tabCache.get(id)!
}
const href = (a: Record<string, string>) => `/d/${a.noteId}${a.tab ? `?tab=${encodeURIComponent(a.tab)}` : ''}`
const label = (title: string, tabTitle: string, tab: string) => `${title || 'Untitled'}${tab ? ` › ${tabTitle || 'Untitled tab'}` : ''}`

/**
 * [[ links another note inline. The title is saved with the link, so readers who can't open that note
 * still see what it was called; for notes the reader can open, the current title shows instead.
 * A link can point at one tab of the note (`tab`, empty for the note itself).
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
    title: { default: '', parseHTML: (el) => el.getAttribute('data-title') ?? el.textContent ?? '', renderHTML: () => ({}) },
    tab: { default: '', parseHTML: (el) => el.getAttribute('data-tab') ?? '', renderHTML: () => ({}) },
    tabTitle: { default: '', parseHTML: (el) => el.getAttribute('data-tab-title') ?? '', renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: 'a[data-note-ref]' }],
  renderHTML: ({ node: { attrs: a } }) => ['a', { href: href(a), 'data-note-ref': a.noteId, 'data-title': a.title, 'data-tab': a.tab || null, 'data-tab-title': a.tabTitle || null, class: 'note-ref' }, label(a.title, a.tabTitle, a.tab)],
  renderText: ({ node: { attrs: a } }) => `[[${label(a.title, a.tabTitle, a.tab)}]]`,
  addNodeView() {
    return ({ node }) => {
      const a = document.createElement('a')
      a.href = href(node.attrs)
      a.className = 'note-ref'
      a.dataset.noteRef = node.attrs.noteId
      a.contentEditable = 'false' // so a click follows the link even in an editable note
      a.textContent = label(this.options.notes().find((n) => n.id === node.attrs.noteId)?.title || node.attrs.title, node.attrs.tabTitle, node.attrs.tab)
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
        items: async ({ query }) => {
          const q = query.toLowerCase().trim()
          const notes = this.options.notes().filter((n) => (n.title || 'Untitled').toLowerCase().includes(q)).slice(0, 20)
          const item = (n: { id: string; title: string }, t?: Tab): SlashItem => ({
            group: 'Notes', title: label(n.title, t?.title ?? '', t?.id ?? ''), description: '', icon,
            run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: 'noteRef', attrs: { noteId: n.id, title: n.title, tab: t?.id ?? '', tabTitle: t?.title ?? '' } }, { type: 'text', text: ' ' }]).run(),
          })
          // once the query narrows to a few notes, offer their tabs too (one fetch per note)
          const tabs = notes.length <= 5 ? await Promise.all(notes.map((n) => tabsOf(n.id))) : []
          return notes.flatMap((n, i) => [item(n), ...(tabs[i]?.length > 1 ? tabs[i].map((t) => item(n, t)) : [])])
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
