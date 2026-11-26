import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import { VueRenderer, type Editor as VueEditor } from '@tiptap/vue-3'
import { parseClip } from './Blocks'
import SlashMenu from './SlashMenu.vue'

export type SlashItem = { title: string; hint: string; run: (editor: Editor, range: Range) => void }

const askLatex = (initial = '') => window.prompt('LaTeX', initial)

export const slashItems: SlashItem[] = [
  { title: 'canvas', hint: 'Inline tldraw board', run: (e, r) => e.chain().focus().deleteRange(r).insertContent({ type: 'canvasBlock' }).run() },
  {
    title: 'math', hint: 'Block LaTeX equation', run: (e, r) => {
      const latex = askLatex()
      e.chain().focus().deleteRange(r).run()
      // the new node ends up selected; step past it so typing doesn't replace it
      if (latex && e.commands.insertBlockMath({ latex })) e.commands.setTextSelection(e.state.selection.to + 1)
    },
  },
  {
    title: 'inline math', hint: 'Inline LaTeX', run: (e, r) => {
      const latex = askLatex()
      e.chain().focus().deleteRange(r).run()
      if (latex) e.commands.insertInlineMath({ latex })
    },
  },
  { title: 'hypothesis', hint: 'Callout', run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'hypothesis' }).run() },
  { title: 'evidence', hint: 'Verified fact', run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'fact' }).run() },
  { title: 'contradicts', hint: 'Counter-evidence', run: (e, r) => e.chain().focus().deleteRange(r).wrapIn('callout', { kind: 'contradicts' }).run() },
  {
    title: 'clip', hint: '▶ 14:22 – 15:08', run: (e, r) => {
      const input = window.prompt('Link and time range, e.g. https://youtu.be/… 14:22-15:08')
      e.chain().focus().deleteRange(r).run()
      const clip = input && parseClip(input)
      if (clip) e.chain().focus().setNode('clip', clip).run()
      else if (input) window.alert('Use: an http(s) link, a space, then a time like 14:22 or 14:22-15:08')
    },
  },
  { title: 'runbook', hint: 'Command + status', run: (e, r) => e.chain().focus().deleteRange(r).setNode('runbook', { lang: 'cmd' }).run() },
  { title: 'heading 1', hint: '#', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { title: 'heading 2', hint: '##', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { title: 'heading 3', hint: '###', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { title: 'bullet list', hint: '-', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: 'numbered list', hint: '1.', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: 'task list', hint: '[]', run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: 'quote', hint: '>', run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: 'code', hint: '```', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { title: 'divider', hint: '---', run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
]

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        items: ({ query }) => slashItems.filter((i) => i.title.includes(query.toLowerCase())),
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
