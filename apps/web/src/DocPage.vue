<script setup lang="ts">
import { Bold, Code, Italic, Sparkles, Strikethrough } from '@lucide/vue'
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
import { Callout, Clip, Runbook } from './editor/Blocks'
import { CanvasBlock } from './editor/CanvasBlock'
import MarginWhispers from './editor/MarginWhispers.vue'
import { SlashCommand } from './editor/SlashCommand'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import BlockToolbar from './editor/BlockToolbar.vue'
import { askLatex } from './ui/feedback'

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
      inlineOptions: { onClick: async (node, pos) => { const latex = await askLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run() } },
      blockOptions: { onClick: async (node, pos) => { const latex = await askLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run() } },
    }),
    CanvasBlock,
    AiMargin,
    AiSource,
    Callout,
    Clip,
    Runbook,
    SlashCommand,
  ],
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  provider.destroy()
  ydoc.destroy()
})

const marks = [
  { name: 'bold', icon: Bold, key: '⌘B' },
  { name: 'italic', icon: Italic, key: '⌘I' },
  { name: 'strike', icon: Strikethrough, key: '⌘⇧S' },
  { name: 'code', icon: Code, key: '⌘E' },
] as const
</script>

<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 text-sm [&>*]:pointer-events-auto">
    <div class="flex items-center gap-1 rounded-full border bg-background/85 py-0.5 pr-3 pl-0.5 text-sm backdrop-blur">
      <DocsMenu :me="me" :doc="doc" :docs="docs" />
      <span class="font-medium text-muted-foreground">opennotes</span><span class="text-stone-300">/</span>
      <input :value="title" placeholder="Untitled" aria-label="Page title" class="w-48 bg-transparent font-medium outline-none placeholder:text-muted-foreground" @input="setTitle(($event.target as HTMLInputElement).value)" />
      <span v-if="status === 'disconnected'" class="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700" title="Edits are kept and sync when the connection returns">Offline</span>
    </div>
    <div class="flex items-center gap-2">
      <InboxPill v-if="editor" :editor="editor" />
      <McpPill :doc="doc" />
    </div>
  </header>

  <main class="mx-auto max-w-[44rem] px-6 pt-28">
    <div ref="column" class="relative">
      <BubbleMenu v-if="editor" :editor="editor" class="flex items-center gap-0.5 rounded-md border bg-popover p-0.5">
        <Button
          v-for="m in marks" :key="m.name" variant="ghost" size="icon-sm" :aria-label="m.name" :title="`${m.name} (${m.key})`" :aria-pressed="editor.isActive(m.name)"
          :class="editor.isActive(m.name) && 'bg-accent'" @click="editor.chain().focus().toggleMark(m.name).run()"
        ><component :is="m.icon" /></Button>
        <Separator orientation="vertical" class="mx-0.5 h-5!" />
        <Button variant="ghost" size="sm" class="text-ai-500 hover:bg-ai-50 hover:text-ai-700" title="Add an AI margin note (⌘K)" @click="requestWhisper(editor)">
          <Sparkles />Ask AI
        </Button>
      </BubbleMenu>
      <BlockToolbar v-if="editor && column" :editor="editor" :column="column" />
      <EditorContent :editor="editor" />
      <MarginWhispers v-if="editor && column" :editor="editor" :column="column" />
    </div>
  </main>
</template>
