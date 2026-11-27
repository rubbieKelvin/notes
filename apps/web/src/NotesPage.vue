<script setup lang="ts">
import { Plus, Search } from '@lucide/vue'
import { ago, noteArt as placeholder } from './noteArt'
import { computed, ref } from 'vue'
import { api, errorText, type DocInfo, type Me } from './api'
import UserMenu from './UserMenu.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from './ui/feedback'

const props = defineProps<{ me: Me; docs: DocInfo[] }>()
document.title = 'All notes · opennotes'

const query = ref('')
const tag = ref<string | null>(null)
const allTags = computed(() => [...new Set(props.docs.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b)))
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.docs.filter((d) =>
    (!tag.value || d.tags.includes(tag.value))
    && (!q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q))))
})

const sections = computed(() => [
  { label: 'Your notes', notes: shown.value.filter((d) => d.role === 'owner') },
  { label: 'Shared with you', notes: shown.value.filter((d) => d.role !== 'owner') },
].filter((sec) => sec.notes.length))

async function create() {
  try {
    const { id } = await api<{ id: string }>('/v1/docs', { body: { title: query.value.trim() && !shown.value.length ? query.value.trim() : '' } })
    location.assign(`/d/${id}`)
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur">
    <UserMenu :me="me" />
    <h1 class="text-sm font-medium">All notes</h1>
    <div class="ml-auto flex items-center gap-2">
      <label class="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm focus-within:ring-2 focus-within:ring-ring/40">
        <Search class="size-4 text-muted-foreground" />
        <input v-model="query" placeholder="Search notes…" aria-label="Search notes" class="w-48 bg-transparent outline-none placeholder:text-muted-foreground" />
      </label>
      <Button size="sm" @click="create"><Plus />{{ query.trim() && !shown.length ? `Create “${query.trim()}”` : 'New note' }}</Button>
    </div>
  </header>

  <main class="mx-auto max-w-6xl p-6">
    <div v-if="allTags.length" class="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
      <button
        v-for="t in allTags" :key="t" type="button" :aria-pressed="tag === t"
        class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
        :class="tag === t ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
        @click="tag = tag === t ? null : t"
      >#{{ t }}</button>
    </div>
    <p v-if="!shown.length" class="py-20 text-center text-sm text-muted-foreground">
      {{ query.trim() || tag ? 'No notes match.' : 'No notes yet.' }}
    </p>
    <section v-for="sec in sections" :key="sec.label" class="mb-10">
      <h2 v-if="sections.length > 1" class="mb-3 text-sm text-muted-foreground">{{ sec.label }}</h2>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4" :aria-label="sec.label">
        <li v-for="d in sec.notes" :key="d.id">
          <a :href="`/d/${d.id}`" class="group block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" data-note-card>
            <div class="grid h-32 place-items-center" :style="{ background: placeholder(d.id).bg }" aria-hidden="true">
              <component :is="placeholder(d.id).icon" class="size-10 transition-transform group-hover:scale-110" :style="{ color: placeholder(d.id).fg }" :stroke-width="1.5" />
            </div>
            <div class="grid gap-1 p-3">
              <div class="flex items-center gap-2">
                <h3 class="flex-1 truncate text-sm font-medium">{{ d.title || 'Untitled' }}</h3>
                <Badge v-if="d.is_public" variant="secondary" class="text-emerald-700">Public</Badge>
                <Badge v-if="d.mcp_exposed_slug" variant="secondary" class="text-emerald-700">MCP</Badge>
              </div>
              <p class="line-clamp-2 min-h-8 text-xs" :class="d.description ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'">{{ d.description || 'No description' }}</p>
              <ul v-if="d.tags.length" class="flex flex-wrap gap-1" aria-label="Tags">
                <li v-for="t in d.tags" :key="t" class="rounded-full bg-secondary px-1.5 text-[11px] text-secondary-foreground">#{{ t }}</li>
              </ul>
              <p class="text-[11px] text-muted-foreground">
                <template v-if="d.role !== 'owner'">{{ d.owner_name }} · {{ d.role === 'edit' ? 'Can edit' : 'Can view' }} · </template>Edited {{ ago(d.updated_at) }}
              </p>
            </div>
          </a>
        </li>
      </ul>
    </section>
  </main>
</template>
