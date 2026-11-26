<script setup lang="ts">
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { onBeforeUnmount, onMounted, ref } from 'vue'

type Item = { id: number; agent_id: string; title: string | null; content_md: string; source_uri: string | null; created_at: number }
const props = defineProps<{ editor: Editor }>()
const items = ref<Item[]>([])
const open = ref(false)
const root = ref<HTMLElement>()

async function load() {
  try {
    const res = await fetch('/v1/inbox')
    if (res.ok) items.value = await res.json()
  } catch { /* server offline: keep the last list */ }
}
// shortcut: polling; switch to the yrs WebSocket push in Phase 3.
const timer = setInterval(load, 15_000)
const outside = (e: PointerEvent) => { if (!root.value?.contains(e.target as Node)) open.value = false }
onMounted(() => { load(); window.addEventListener('pointerdown', outside) })
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('pointerdown', outside) })

// shortcut: markdown is shown as plain paragraphs; add a markdown parser if agents send rich formatting.
const paragraphs = (md: string) => md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

function block(item: Item, provenance: 'ai_agent' | 'human_edited'): JSONContent {
  return {
    type: 'aiSource', attrs: { agent: item.agent_id, provenance },
    content: paragraphs(item.content_md).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  }
}

async function remove(item: Item) {
  items.value = items.value.filter((i) => i.id !== item.id)
  await fetch(`/v1/inbox/${item.id}`, { method: 'DELETE' }).catch(() => {})
}

function absorb(item: Item, provenance: 'ai_agent' | 'human_edited') {
  props.editor.chain().focus().insertContent(block(item, provenance)).run()
  open.value = false
  remove(item)
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
const dragEnd = (e: DragEvent, item: Item) => e.dataTransfer?.dropEffect !== 'none' && remove(item)
</script>

<template>
  <div v-if="items.length" ref="root" class="relative">
    <button
      class="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-stone-500 backdrop-blur hover:text-stone-900"
      :aria-expanded="open" aria-haspopup="dialog" @click="open = !open" @keydown.esc="open = false"
    >
      <span class="size-1.5 rounded-full bg-emerald-500" />{{ items.length }} AI
    </button>
    <div v-if="open" role="dialog" aria-label="AI inbox" class="absolute right-0 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg" @keydown.esc="open = false">
      <article
        v-for="item in items" :key="item.id" draggable="true"
        class="cursor-grab rounded-md p-2.5 hover:bg-stone-50"
        @dragstart="dragStart($event, item)" @dragend="dragEnd($event, item)"
      >
        <header class="flex justify-between text-[11px] text-stone-400">
          <span class="truncate">{{ item.agent_id }}</span>
          <a v-if="item.source_uri && /^https?:\/\//i.test(item.source_uri)" :href="item.source_uri" target="_blank" rel="noopener noreferrer" class="hover:underline">source</a>
        </header>
        <h3 v-if="item.title" class="text-sm font-medium text-stone-800">{{ item.title }}</h3>
        <p class="line-clamp-3 whitespace-pre-line text-sm text-stone-600">{{ item.content_md }}</p>
        <div class="mt-1.5 flex gap-3 text-xs text-stone-500">
          <button class="hover:text-stone-900" title="Insert into the page and make it yours to rewrite" @click="absorb(item, 'human_edited')">Rewrite-to-Own</button>
          <button class="hover:text-stone-900" @click="absorb(item, 'ai_agent')">Insert</button>
          <button class="hover:text-stone-900" @click="remove(item)">Dismiss</button>
        </div>
      </article>
    </div>
  </div>
</template>
