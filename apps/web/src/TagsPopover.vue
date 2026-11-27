<script setup lang="ts">
import { Tag, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { api, errorText, type DocInfo } from './api'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from './ui/feedback'

/** Your own tags on this note; nobody else sees them. Shown and filtered on All notes. */
const props = defineProps<{ doc: DocInfo; docs: DocInfo[] }>()
const draft = ref('')
const known = computed(() => [...new Set(props.docs.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b)))
const suggestions = computed(() => {
  const q = draft.value.trim().toLowerCase()
  return known.value.filter((t) => !has(t) && (!q || t.toLowerCase().includes(q))).slice(0, 8)
})
const has = (t: string) => props.doc.tags.some((x) => x.toLowerCase() === t.toLowerCase())

async function save(tags: string[]) {
  try {
    // the doc object is shared with the notes list, so All notes and the switcher see the change too
    props.doc.tags = await api<string[]>(`/v1/docs/${props.doc.id}/tags`, { method: 'PUT', body: { tags } })
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
function add(t = draft.value) {
  const tag = t.trim().replace(/^#/, '')
  draft.value = ''
  if (tag && !has(tag)) save([...props.doc.tags, tag])
}
const remove = (t: string) => save(props.doc.tags.filter((x) => x !== t))
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="rounded-full bg-background/85 text-muted-foreground backdrop-blur" :aria-label="`Tags${doc.tags.length ? `: ${doc.tags.join(', ')}` : ''}`">
        <Tag />{{ doc.tags.length ? doc.tags.length : 'Tags' }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-72 p-3">
      <p class="mb-2 text-xs text-muted-foreground">Only you see your tags.</p>
      <ul v-if="doc.tags.length" class="mb-2 flex flex-wrap gap-1" aria-label="Your tags">
        <li v-for="t in doc.tags" :key="t" class="flex items-center gap-0.5 rounded-full bg-secondary py-0.5 pr-1 pl-2 text-xs">
          {{ t }}
          <button type="button" class="rounded-full p-0.5 hover:bg-background" :aria-label="`Remove tag ${t}`" @click="remove(t)"><X class="size-3" /></button>
        </li>
      </ul>
      <form @submit.prevent="add()">
        <input v-model="draft" maxlength="40" placeholder="Add a tag…" aria-label="Add a tag" class="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
      </form>
      <div v-if="suggestions.length" class="mt-2 flex flex-wrap gap-1">
        <button v-for="t in suggestions" :key="t" type="button" class="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" @click="add(t)">+ {{ t }}</button>
      </div>
    </PopoverContent>
  </Popover>
</template>
