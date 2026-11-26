<script setup lang="ts">
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, Sparkles } from '@lucide/vue'
import { api } from './api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Item = { id: string; agent_id: string; title: string | null; content_md: string; source_uri: string | null; created_at: string }
const props = defineProps<{ editor: Editor }>()
const items = ref<Item[]>([])
const open = ref(false)

async function load() {
  try {
    items.value = await api<Item[]>('/v1/inbox')
  } catch { /* offline: keep the last list */ }
}
// shortcut: polls every 15s; push over the sync socket if inbox latency matters.
const timer = setInterval(load, 15_000)
onMounted(load)
onBeforeUnmount(() => clearInterval(timer))

// shortcut: markdown is shown as plain paragraphs; add a markdown parser if agents send rich formatting.
const paragraphs = (md: string) => md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

function block(item: Item, provenance: 'ai_agent' | 'human_edited'): JSONContent {
  return {
    type: 'aiSource', attrs: { agent: item.agent_id, provenance },
    content: paragraphs(item.content_md).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  }
}

async function remove(item: Item, action: 'absorb' | 'archive') {
  items.value = items.value.filter((i) => i.id !== item.id)
  await api(`/v1/inbox/${item.id}/${action}`, { method: 'POST' }).catch(load)
}

function absorb(item: Item, provenance: 'ai_agent' | 'human_edited') {
  props.editor.chain().focus().insertContent(block(item, provenance)).run()
  open.value = false
  remove(item, 'absorb')
}

// Dragging hands ProseMirror ready-made ai-source HTML; built via DOM so agent text stays inert.
function dragStart(e: DragEvent, item: Item) {
  const div = document.createElement('div')
  Object.assign(div.dataset, { type: 'ai-source', agent: item.agent_id, provenance: 'ai_agent' })
  div.dataset.pmSlice = '0 0 []' // closed slice: drop as its own block instead of merging into the paragraph
  for (const text of paragraphs(item.content_md)) div.appendChild(document.createElement('p')).textContent = text
  e.dataTransfer?.setData('text/html', div.outerHTML)
  e.dataTransfer?.setData('text/plain', item.content_md)
}
const dragEnd = (e: DragEvent, item: Item) => e.dataTransfer?.dropEffect !== 'none' && remove(item, 'absorb')
</script>

<template>
  <Popover v-if="items.length" v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="rounded-full bg-background/85 backdrop-blur">
        <span class="relative flex size-2"><span class="absolute inline-flex size-full animate-ping rounded-full bg-ai-300 opacity-75" /><span class="relative size-2 rounded-full bg-ai-500" /></span>{{ items.length }} AI
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="max-h-[70vh] w-[26rem] overflow-y-auto p-0">
      <header class="sticky top-0 z-[1] flex items-center gap-2 border-b bg-popover px-4 py-3">
        <Sparkles class="size-4 text-ai-500" />
        <h2 class="text-sm font-semibold">AI inbox</h2>
        <span class="ml-auto text-xs text-muted-foreground">Drag a card into the page</span>
      </header>
      <div class="divide-y">
        <article
          v-for="item in items" :key="item.id" draggable="true"
          class="cursor-grab px-4 py-3 hover:bg-muted/50 active:cursor-grabbing"
          @dragstart="dragStart($event, item)" @dragend="dragEnd($event, item)"
        >
          <header class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" class="truncate bg-ai-50 text-ai-700">{{ item.agent_id }}</Badge>
            <a v-if="item.source_uri && /^https?:\/\//i.test(item.source_uri)" :href="item.source_uri" target="_blank" rel="noopener noreferrer" class="flex items-center gap-0.5 hover:text-foreground">source<ExternalLink class="size-3" /></a>
          </header>
          <h3 v-if="item.title" class="mt-1.5 text-sm font-medium">{{ item.title }}</h3>
          <p class="mt-0.5 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">{{ item.content_md }}</p>
          <div class="mt-2.5 flex gap-1.5">
            <Button variant="outline" size="xs" title="Insert into the page and make it yours to rewrite" @click="absorb(item, 'human_edited')">Rewrite-to-Own</Button>
            <Button variant="outline" size="xs" @click="absorb(item, 'ai_agent')">Insert</Button>
            <Button variant="ghost" size="xs" class="ml-auto text-muted-foreground" @click="remove(item, 'archive')">Dismiss</Button>
          </div>
        </article>
      </div>
    </PopoverContent>
  </Popover>
</template>
