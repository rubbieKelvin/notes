<script setup lang="ts">
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Collaboration } from '@tiptap/extension-collaboration'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Placeholder } from '@tiptap/extensions'
import { StarterKit } from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { common, createLowlight } from 'lowlight'
import { onBeforeUnmount, ref } from 'vue'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import type { DocInfo, Me } from './api'
import DocsMenu from './DocsMenu.vue'
import InboxPill from './InboxPill.vue'
import McpPill from './McpPill.vue'
import { AiMargin, requestWhisper } from './editor/AiMargin'
import { AiSource } from './editor/AiSource'
import { CanvasBlock } from './editor/CanvasBlock'
import MarginWhispers from './editor/MarginWhispers.vue'
import { SlashCommand } from './editor/SlashCommand'

const props = defineProps<{ me: Me; doc: DocInfo; docs: DocInfo[] }>()

// The yrs server owns the document; every tab of it stays in sync over this socket.
const ydoc = new Y.Doc()
const wsBase = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/v1/sync`
const provider = new WebsocketProvider(wsBase, props.doc.id, ydoc)
const status = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
provider.on('status', (e: { status: 'connecting' | 'connected' | 'disconnected' }) => (status.value = e.status))

const meta = ydoc.getMap<string>('meta')
const title = ref(meta.get('title') ?? '')
meta.observe(() => (title.value = meta.get('title') ?? ''))
const setTitle = (t: string) => meta.set('title', t)
const syncTabTitle = () => (document.title = title.value ? `${title.value} · opennotes` : 'opennotes')
meta.observe(syncTabTitle)
syncTabTitle()

const column = ref<HTMLElement>()
const editLatex = (latex: string) => window.prompt('LaTeX', latex)

const editor = useEditor({
  autofocus: 'end',
  editorProps: { attributes: { class: 'prose prose-stone max-w-none' } },
  extensions: [
    StarterKit.configure({ codeBlock: false, undoRedo: false }), // Collaboration brings its own CRDT-aware undo
    Collaboration.configure({ document: ydoc }),
    CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: "Type '/' for commands…" }),
    Mathematics.configure({
      inlineOptions: { onClick: (node, pos) => { const latex = editLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run() } },
      blockOptions: { onClick: (node, pos) => { const latex = editLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run() } },
    }),
    CanvasBlock,
    AiMargin,
    AiSource,
    SlashCommand,
  ],
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  provider.destroy()
  ydoc.destroy()
})

const marks = [
  { name: 'bold', label: 'B', cls: 'font-bold' },
  { name: 'italic', label: 'I', cls: 'italic' },
  { name: 'strike', label: 'S', cls: 'line-through' },
  { name: 'code', label: '</>', cls: 'font-mono' },
] as const
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 text-sm">
    <div class="flex items-center gap-1 rounded-full bg-white/80 py-1 pl-1 pr-3 text-stone-400 backdrop-blur">
      <DocsMenu :me="me" :doc="doc" :docs="docs" />
      <span>opennotes</span><span>/</span>
      <input :value="title" placeholder="Untitled" aria-label="Page title" class="w-48 bg-transparent text-stone-700 outline-none placeholder:text-stone-400" @input="setTitle(($event.target as HTMLInputElement).value)" />
      <span v-if="status === 'disconnected'" class="ml-1 rounded bg-amber-50 px-1.5 text-[11px] text-amber-700" title="Edits are kept and sync when the connection returns">offline</span>
    </div>
    <div class="flex items-center gap-2">
      <InboxPill v-if="editor" :editor="editor" />
      <McpPill :doc="doc" />
    </div>
  </header>

  <main class="mx-auto max-w-2xl px-6 pt-28">
    <div ref="column" class="relative">
      <BubbleMenu v-if="editor" :editor="editor" class="flex gap-0.5 rounded-lg border border-stone-200 bg-white p-1 shadow-md">
        <button
          v-for="m in marks" :key="m.name" :aria-label="m.name" :aria-pressed="editor.isActive(m.name)"
          class="min-w-7 rounded px-1.5 py-0.5 text-sm hover:bg-stone-100" :class="[m.cls, editor.isActive(m.name) && 'bg-stone-100']"
          @click="editor.chain().focus().toggleMark(m.name).run()"
        >{{ m.label }}</button>
        <button class="rounded px-1.5 py-0.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900" title="Margin note (⌘K)" @click="requestWhisper(editor)">+ AI</button>
      </BubbleMenu>
      <EditorContent :editor="editor" />
      <MarginWhispers v-if="editor && column" :editor="editor" :column="column" />
    </div>
  </main>
</template>
