<script setup lang="ts">
import { Bold, Code, Italic, Pencil, Sparkles, Strikethrough, Trash2 } from '@lucide/vue'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Collaboration } from '@tiptap/extension-collaboration'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Placeholder } from '@tiptap/extensions'
import { StarterKit } from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { common, createLowlight } from 'lowlight'
import { markRaw, onBeforeUnmount, ref } from 'vue'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { api, errorText, type DocInfo, type Me } from './api'
import NoteDetailsDialog from './NoteDetailsDialog.vue'
import NoteSwitcher from './NoteSwitcher.vue'
import UserMenu from './UserMenu.vue'
import InboxPill from './InboxPill.vue'
import McpPill from './McpPill.vue'
import { AiMargin, requestWhisper } from './editor/AiMargin'
import { AiSource } from './editor/AiSource'
import { Callout, Clip, Runbook } from './editor/Blocks'
import { CanvasBlock } from './editor/CanvasBlock'
import { canvasesOf } from './editor/canvas/store'
import MarginWhispers from './editor/MarginWhispers.vue'
import { SlashCommand } from './editor/SlashCommand'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import BlockToolbar from './editor/BlockToolbar.vue'
import { askLatex, confirmDialog, toast } from './ui/feedback'

const props = defineProps<{ me: Me; doc: DocInfo; docs: DocInfo[] }>()

// The yrs server owns the document; every tab of it stays in sync over this socket.
const ydoc = new Y.Doc()
canvasesOf(ydoc) // define root types before the first update arrives; defining one mid-sync breaks re-encoding that update
const wsBase = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/v1/sync`
const provider = new WebsocketProvider(wsBase, props.doc.id, ydoc)
const status = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
// Shown to others on shared canvases (cursor label and color).
const hue = [...props.me.email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0)
provider.awareness.setLocalStateField('user', { name: props.me.email.split('@')[0], color: `hsl(${hue} 70% 45%)` })
provider.on('status', (e: { status: 'connecting' | 'connected' | 'disconnected' }) => (status.value = e.status))

const meta = ydoc.getMap<string>('meta')
const title = ref(meta.get('title') ?? '')
meta.observe(() => (title.value = meta.get('title') ?? ''))
const details = ref<InstanceType<typeof NoteDetailsDialog>>()

async function deletePage() {
  if (!(await confirmDialog({ title: `Delete “${title.value || 'Untitled'}”?`, body: "The page, its canvases and margin notes are deleted for good. This can't be undone.", confirmLabel: 'Delete page', danger: true }))) return
  try {
    await api(`/v1/docs/${props.doc.id}`, { method: 'DELETE' })
    location.assign('/')
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
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
    CanvasBlock.configure({ ydoc: markRaw(ydoc), provider: markRaw(provider) }), // raw: Yjs compares types by identity, a Vue proxy breaks that
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
    <div class="flex items-center gap-0.5 rounded-full bg-background/85 p-0.5 text-sm backdrop-blur">
      <UserMenu :me="me" />
      <NoteSwitcher :doc="doc" :docs="docs" :title="title" />
      <Button variant="ghost" size="icon-sm" class="rounded-full text-muted-foreground" aria-label="Edit title and description" title="Edit title and description" @click="details?.show()"><Pencil /></Button>
      <span v-if="status === 'disconnected'" class="mr-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700" title="Edits are kept and sync when the connection returns">Offline</span>
    </div>
    <div class="flex items-center gap-2">
      <InboxPill v-if="editor" :editor="editor" />
      <McpPill :doc="doc" />
      <Button variant="outline" size="icon-sm" class="rounded-full bg-background/85 text-muted-foreground backdrop-blur hover:bg-destructive/10 hover:text-destructive" aria-label="Delete this page" title="Delete this page" @click="deletePage"><Trash2 /></Button>
    </div>
    <NoteDetailsDialog ref="details" :meta="meta" />
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
