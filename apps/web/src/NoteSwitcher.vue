<script setup lang="ts">
import { ChevronDown, FileText, LayoutGrid, Plus, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { api, errorText, type DocInfo } from './api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from './ui/feedback'

/** `title` is the live title of the open note (from the Y.Doc); the list's copy can lag behind it. */
const props = defineProps<{ doc: DocInfo; docs: DocInfo[]; title: string }>()

const open = ref(false)
const query = ref('')
const list = ref<DocInfo[]>(props.docs)
const active = ref(0)

// shortcut: switching pages reloads the app; fine while boot is fast, revisit if it isn't.
const go = (id: string) => location.assign(`/d/${id}`)

watch(open, async (o) => {
  if (!o) return
  query.value = ''
  active.value = 0
  try { list.value = await api<DocInfo[]>('/v1/docs') } catch { /* keep what we have */ }
})

const titleOf = (d: DocInfo) => (d.id === props.doc.id ? props.title : d.title) || 'Untitled'
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? list.value.filter((d) => titleOf(d).toLowerCase().includes(q) || d.description.toLowerCase().includes(q)) : list.value
})
watch(query, () => (active.value = 0))
// With no match the footer button creates a page titled with the query.
const createLabel = computed(() => (query.value.trim() && !matches.value.length ? `Create “${query.value.trim()}”` : 'New page'))

const busy = ref(false)
async function create() {
  busy.value = true
  try {
    const title = matches.value.length ? '' : query.value.trim()
    const { id } = await api<{ id: string }>('/v1/docs', { body: { title } })
    go(id)
  } catch (e) {
    toast(errorText(e), 'error')
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) {
  const n = matches.value.length
  if (e.key === 'ArrowDown' && n) active.value = (active.value + 1) % n
  else if (e.key === 'ArrowUp' && n) active.value = (active.value - 1 + n) % n
  else if (e.key === 'Enter') {
    const d = matches.value[active.value]
    if (!d) create()
    else if (d.id === props.doc.id) open.value = false
    else go(d.id)
  } else return
  e.preventDefault()
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="sm" class="max-w-64 gap-1 rounded-full px-2.5 font-medium" aria-label="Switch note" :title="title || 'Untitled'">
        <span class="truncate" :class="!title && 'text-muted-foreground'">{{ title || 'Untitled' }}</span>
        <ChevronDown class="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 p-0">
      <div class="flex items-center gap-2 border-b px-3">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <input
          v-model="query" autofocus placeholder="Search notes…" aria-label="Search notes" role="combobox" aria-controls="note-list"
          :aria-activedescendant="matches[active] ? `note-${matches[active].id}` : undefined" aria-expanded="true"
          class="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" @keydown="onKey"
        />
        <Button as="a" href="/notes" variant="ghost" size="icon-xs" aria-label="See all notes" title="See all notes"><LayoutGrid /></Button>
      </div>
      <ul id="note-list" role="listbox" aria-label="Notes" class="max-h-72 overflow-y-auto p-1">
        <li
          v-for="(d, i) in matches" :id="`note-${d.id}`" :key="d.id" role="option" :aria-selected="i === active"
          class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm" :class="i === active && 'bg-accent'"
          @pointerenter="active = i" @click="d.id === doc.id ? (open = false) : go(d.id)"
        >
          <FileText class="size-4 shrink-0 text-muted-foreground" />
          <span class="grid min-w-0 flex-1">
            <span class="truncate" :class="d.id === doc.id && 'font-medium'">{{ titleOf(d) }}</span>
            <span v-if="d.description" class="truncate text-xs text-muted-foreground">{{ d.description }}</span>
          </span>
          <span v-if="d.id === doc.id" class="text-[11px] text-muted-foreground">Open</span>
          <Badge v-else-if="d.role !== 'owner'" variant="secondary" :title="`Shared by ${d.owner_name}`">Shared</Badge>
          <Badge v-else-if="d.is_public" variant="secondary" class="text-emerald-700">Public</Badge>
          <Badge v-else-if="d.mcp_exposed_slug" variant="secondary" class="text-emerald-700">MCP</Badge>
        </li>
        <li v-if="!matches.length" class="px-2 py-6 text-center text-sm text-muted-foreground">No notes match “{{ query.trim() }}”</li>
      </ul>
      <div class="border-t p-1">
        <Button variant="ghost" size="sm" class="w-full justify-start" :disabled="busy" @click="create"><Plus />{{ createLabel }}</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
