<script setup lang="ts">
import { Bold, Code, Italic, Pencil, Sparkles, Strikethrough, Trash2 } from '@lucide/vue'
import { EditorContent } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { TextSelection } from '@tiptap/pm/state'
import { computed, onBeforeUnmount, ref } from 'vue'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { api, displayName, errorText, type DocInfo, type Me } from './api'
import NoteDetailsDialog from './NoteDetailsDialog.vue'
import NoteSwitcher from './NoteSwitcher.vue'
import UserMenu from './UserMenu.vue'
import InboxPill from './InboxPill.vue'
import McpPill from './McpPill.vue'
import { requestWhisper } from './editor/AiMargin'
import { noteExtensions } from './editor/extensions'
import { useTabEditor, useTabs } from './editor/tabs'
import NoteTabs from './NoteTabs.vue'
import TagsPopover from './TagsPopover.vue'
import { canvasesOf } from './editor/canvas/store'
import MarginWhispers from './editor/MarginWhispers.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import BlockToolbar from './editor/BlockToolbar.vue'
import { confirmDialog, toast } from './ui/feedback'
import ShareDialog from './ShareDialog.vue'
import CommentsPanel from './CommentsPanel.vue'
import { sheetReady } from './telemetry'

const props = defineProps<{ me: Me; doc: DocInfo; docs: DocInfo[] }>()
const owner = props.doc.role === 'owner'
const readOnly = props.doc.role === 'view'

// The yrs server owns the document; every tab of it stays in sync over this socket.
const ydoc = new Y.Doc()
canvasesOf(ydoc) // define root types before the first update arrives; defining one mid-sync breaks re-encoding that update
const wsBase = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/v1/sync`
const provider = new WebsocketProvider(wsBase, props.doc.id, ydoc)
const status = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
// Shown to others on shared canvases (cursor label and color).
const hue = [...props.me.email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0)
provider.awareness.setLocalStateField('user', { name: displayName(props.me), color: `hsl(${hue} 70% 45%)` })
provider.on('status', (e: { status: 'connecting' | 'connected' | 'disconnected' }) => (status.value = e.status))
if (!readOnly) provider.once('sync', () => sheetReady(props.doc.id))

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

const { tabs, active: activeTab } = useTabs(ydoc)
const editor = useTabEditor(activeTab, (field) => ({
  autofocus: readOnly ? false : 'end',
  editable: !readOnly,
  editorProps: { attributes: { class: 'prose prose-stone max-w-none' } },
  extensions: noteExtensions({
    ydoc, provider, docId: props.doc.id, readOnly, field, editor: () => editor.value,
    notes: () => props.docs.filter((d) => d.id !== props.doc.id),
  }),
}))
const sharedBy = computed(() => (owner ? '' : `${props.doc.owner_name} shared this · ${readOnly ? 'Can view' : 'Can edit'}`))

onBeforeUnmount(() => {
  provider.destroy()
  ydoc.destroy()
})

// Formatting is for selected text: not for a selected file, canvas or equation.
const onlyText = ({ view, state, from, to }: { view: { hasFocus: () => boolean }; state: { selection: unknown; doc: { textBetween: (a: number, b: number) => string } }; from: number; to: number }) =>
  view.hasFocus() && state.selection instanceof TextSelection && state.doc.textBetween(from, to).trim().length > 0

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
      <Button v-if="!readOnly" variant="ghost" size="icon-sm" class="rounded-full text-muted-foreground" aria-label="Edit title and description" title="Edit title and description" @click="details?.show()"><Pencil /></Button>
      <span v-if="sharedBy" class="mx-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground" data-shared-badge>{{ sharedBy }}</span>
      <span v-if="status === 'disconnected'" class="mr-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700" title="Edits are kept and sync when the connection returns">Offline</span>
    </div>
    <div class="flex items-center gap-2">
      <TagsPopover :doc="doc" :docs="docs" />
      <InboxPill v-if="editor && !readOnly" :key="activeTab" :editor="editor" />
      <CommentsPanel :doc-id="doc.id" />
      <template v-if="owner">
      <ShareDialog :doc="doc" :me="me" :title="title" />
      <McpPill :doc="doc" />
      <Button variant="outline" size="icon-sm" class="rounded-full bg-background/85 text-muted-foreground backdrop-blur hover:bg-destructive/10 hover:text-destructive" aria-label="Delete this page" title="Delete this page" @click="deletePage"><Trash2 /></Button>
      </template>
    </div>
    <NoteDetailsDialog ref="details" :meta="meta" />
  </header>

  <main class="mx-auto max-w-[44rem] px-6 pt-28">
    <div ref="column" class="group/note relative">
      <NoteTabs v-model="activeTab" :ydoc="ydoc" :tabs="tabs" :read-only="readOnly" />
      <!-- one editor per tab: everything bound to it remounts with it -->
      <div :key="activeTab">
        <BubbleMenu v-if="editor && !readOnly" :editor="editor" :should-show="onlyText" class="flex items-center gap-0.5 rounded-md border bg-popover p-0.5">
          <Button
            v-for="m in marks" :key="m.name" variant="ghost" size="icon-sm" :aria-label="m.name" :title="`${m.name} (${m.key})`" :aria-pressed="editor.isActive(m.name)"
            :class="editor.isActive(m.name) && 'bg-accent'" @click="editor.chain().focus().toggleMark(m.name).run()"
          ><component :is="m.icon" /></Button>
          <Separator orientation="vertical" class="mx-0.5 h-5!" />
          <Button variant="ghost" size="sm" class="text-ai-500 hover:bg-ai-50 hover:text-ai-700" title="Add an AI margin note (⌘K)" @click="requestWhisper(editor)">
            <Sparkles />Ask AI
          </Button>
        </BubbleMenu>
        <BlockToolbar v-if="editor && column && !readOnly" :editor="editor" :column="column" />
        <EditorContent :editor="editor" />
        <MarginWhispers v-if="editor && column" :editor="editor" :column="column" />
      </div>
    </div>
  </main>
</template>
