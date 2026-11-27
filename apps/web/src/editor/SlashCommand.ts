import {
  BadgeCheck, Braces, FileText, Link2, Film, Image, Music, Paperclip, Heading1, Heading2, Heading3, Lightbulb, List, ListChecks, ListOrdered, Minus, PenTool,
  Quote, Radical, Scale, Sigma, SquarePlay, SquareTerminal, type LucideIcon,
} from '@lucide/vue'
import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import { VueRenderer, type Editor as VueEditor } from '@tiptap/vue-3'
import { markRaw } from 'vue'
import { askLatex, promptDialog } from '../ui/feedback'
import { parseClip } from './Blocks'
import SlashMenu from './SlashMenu.vue'

export type SlashItem = {
  title: string
  description: string
  group: 'Basic' | 'Thinking' | 'Media & math' | 'Files' | 'Notes'
  icon: LucideIcon
  keywords?: string[]
  run: (editor: Editor, range: Range) => void
}

export const clipPrompt = (value = '') => promptDialog({
  title: 'Clip', label: 'Link and time range', value, placeholder: 'https://youtu.be/… 14:22-15:08', confirmLabel: value ? 'Update' : 'Insert',
  validate: (v) => (parseClip(v) ? null : 'Use an http(s) link, a space, then a time like 14:22 or 14:22-15:08'),
})

/** Removes the typed "/query" first, so the prompt dialog's async gap doesn't leave it behind. */
async function insertMath(e: Editor, r: Range, block: boolean) {
  e.chain().focus().deleteRange(r).run()
  const latex = await askLatex()
  if (!latex) return void e.commands.focus()
  if (!block) return void e.chain().focus().insertInlineMath({ latex }).run()
  // the new node ends up selected; step past it so typing doesn't replace it
  if (e.chain().focus().insertBlockMath({ latex }).run()) e.commands.setTextSelection(e.state.selection.to + 1)
}

export const slashItems: SlashItem[] = ([
  { group: 'Basic', title: 'Heading 1', description: 'Big section heading', icon: Heading1, keywords: ['h1', 'title', '#'], run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { group: 'Basic', title: 'Heading 2', description: 'Medium section heading', icon: Heading2, keywords: ['h2', 'subtitle', '##'], run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { group: 'Basic', title: 'Heading 3', description: 'Small section heading', icon: Heading3, keywords: ['h3', '###'], run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { group: 'Basic', title: 'Bulleted list', description: 'A simple list', icon: List, keywords: ['ul', 'unordered', '-'], run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { group: 'Basic', title: 'Numbered list', description: 'A list with numbers', icon: ListOrdered, keywords: ['ol', 'ordered', '1.'], run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { group: 'Basic', title: 'Checklist', description: 'Track tasks', icon: ListChecks, keywords: ['todo', 'task', 'checkbox', '[]'], run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { group: 'Basic', title: 'Quote', description: 'Quoted text', icon: Quote, keywords: ['blockquote', '>'], run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { group: 'Basic', title: 'Code block', description: 'Syntax-highlighted code', icon: Braces, keywords: ['code', 'snippet', '```'], run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { group: 'Basic', title: 'Divider', description: 'Separate sections', icon: Minus, keywords: ['hr', 'rule', 'line', '---'], run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },

  { group: 'Basic', title: 'Link to note', description: 'Reference another note (or type [[)', icon: Link2, keywords: ['reference', 'mention', 'page', '[['], run: (e, r) => e.chain().focus().deleteRange(r).insertContent('[[').run() },

  { group: 'Thinking', title: 'Hypothesis', description: 'An idea you still need to test', icon: Lightbulb, keywords: ['callout', 'idea', 'guess'], run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'hypothesis' }).run() },
  { group: 'Thinking', title: 'Evidence', description: 'A verified fact', icon: BadgeCheck, keywords: ['fact', 'verified', 'callout', 'proof'], run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'fact' }).run() },
  { group: 'Thinking', title: 'Contradicts', description: 'Counter-evidence', icon: Scale, keywords: ['against', 'counter', 'callout'], run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'contradicts' }).run() },
  { group: 'Thinking', title: 'Runbook', description: 'Shell, SQL or HTTP snippet with a status', icon: SquareTerminal, keywords: ['command', 'sql', 'http', 'shell', 'ops'], run: (e, r) => e.chain().focus().deleteRange(r).setNode('runbook', { lang: 'cmd' }).run() },

  { group: 'Media & math', title: 'Canvas', description: 'Inline whiteboard you can expand', icon: PenTool, keywords: ['draw', 'sketch', 'diagram', 'whiteboard', 'pen'], run: (e, r) => e.chain().focus().deleteRange(r).insertCanvas().run() },
  { group: 'Media & math', title: 'Math', description: 'Block LaTeX equation', icon: Sigma, keywords: ['latex', 'equation', 'katex', '$$'], run: (e, r) => insertMath(e, r, true) },
  { group: 'Media & math', title: 'Inline math', description: 'LaTeX inside a sentence', icon: Radical, keywords: ['latex', 'equation', 'formula', '$'], run: (e, r) => insertMath(e, r, false) },
  {
    group: 'Media & math', title: 'Clip', description: 'Timestamped video or audio quote', icon: SquarePlay, keywords: ['video', 'youtube', 'audio', 'timestamp', 'transcript'],
    run: async (e, r) => {
      e.chain().focus().deleteRange(r).run()
      const clip = parseClip((await clipPrompt()) ?? '')
      if (clip) e.chain().focus().setNode('clip', clip).run()
      else e.commands.focus()
    },
  },

  { group: 'Files', title: 'File', description: 'Upload or attach any file', icon: Paperclip, keywords: ['upload', 'attachment', 'attach', 'storage'], run: (e, r) => e.chain().focus().deleteRange(r).insertFile('file').run() },
  { group: 'Files', title: 'Image', description: 'Upload a picture', icon: Image, keywords: ['photo', 'picture', 'png', 'jpg', 'upload'], run: (e, r) => e.chain().focus().deleteRange(r).insertFile('image').run() },
  { group: 'Files', title: 'Video', description: 'Upload a video, up to 100 MB', icon: Film, keywords: ['mp4', 'movie', 'recording', 'upload'], run: (e, r) => e.chain().focus().deleteRange(r).insertFile('video').run() },
  { group: 'Files', title: 'Audio', description: 'Upload a recording or song', icon: Music, keywords: ['mp3', 'sound', 'voice', 'upload'], run: (e, r) => e.chain().focus().deleteRange(r).insertFile('audio').run() },
  { group: 'Files', title: 'PDF', description: 'Upload a PDF to read inline', icon: FileText, keywords: ['document', 'paper', 'upload'], run: (e, r) => e.chain().focus().deleteRange(r).insertFile('pdf').run() },
] as SlashItem[]).map((i) => ({ ...i, icon: markRaw(i.icon) })) // components in reactive props must stay raw

/** Ranks items for a query: title prefix, then word prefix, then substring in title or keywords. */
export function filterSlashItems(query: string, items = slashItems): SlashItem[] {
  const q = query.toLowerCase().trim()
  if (!q) return items
  const score = (i: SlashItem) => {
    const t = i.title.toLowerCase()
    if (t.startsWith(q)) return 0
    if (t.split(' ').some((w) => w.startsWith(q))) return 1
    if (i.keywords?.some((k) => k.startsWith(q))) return 2
    if (t.includes(q) || i.keywords?.some((k) => k.includes(q))) return 3
    return -1
  }
  return items.map((i) => [i, score(i)] as const).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([i]) => i)
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let menu: VueRenderer | undefined
          let unmount: (() => void) | undefined
          return {
            onStart: (props) => {
              menu = new VueRenderer(SlashMenu, { props, editor: props.editor as VueEditor })
              unmount = props.mount(menu.element as HTMLElement)
            },
            onUpdate: (props) => menu?.updateProps(props),
            onKeyDown: ({ event, view }) => event.key === 'Escape' ? (exitSuggestion(view), true) : menu?.ref?.onKeyDown(event) ?? false,
            onExit: () => { unmount?.(); menu?.destroy() },
          }
        },
      }),
    ]
  },
})
