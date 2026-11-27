<script setup lang="ts">
import { Download, Search, Trash2, Upload } from '@lucide/vue'
import { computed, ref } from 'vue'
import { api, errorText, type Me } from './api'
import UserMenu from './UserMenu.vue'
import FilePreviewDialog from './FilePreviewDialog.vue'
import { Button } from '@/components/ui/button'
import { KIND_ICON, fileKind, formatSize, uploadFile, type Storage, type StoredFile } from './files'
import { ago } from './noteArt'
import { confirmDialog, toast } from './ui/feedback'

/** Storage: every file you've uploaded, the notes it's in, and how much of your space it takes. */
defineProps<{ me: Me }>()
document.title = 'Files · opennotes'

const storage = ref<Storage>()
const query = ref('')
const previewing = ref<StoredFile | null>(null)
const uploading = ref<{ name: string; progress: number } | null>(null)

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const files = storage.value?.files ?? []
  return q ? files.filter((f) => f.name.toLowerCase().includes(q) || f.notes.some((n) => n.title.toLowerCase().includes(q))) : files
})
const usedPct = computed(() => (storage.value ? Math.min(100, (storage.value.used / storage.value.quota) * 100) : 0))

async function load() {
  try {
    storage.value = await api<Storage>('/v1/files')
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
load()

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  for (const f of [...(input.files ?? [])]) {
    uploading.value = { name: f.name, progress: 0 }
    try {
      await uploadFile(f, { onProgress: (p) => uploading.value && (uploading.value.progress = p) })
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }
  uploading.value = null
  input.value = ''
  load()
}

async function remove(f: StoredFile) {
  const inNotes = f.notes.length + f.hidden_notes
  const body = inNotes
    ? `It's in ${inNotes} note${inNotes > 1 ? 's' : ''}, which will show it as deleted. This can't be undone.`
    : "It isn't in any note. This can't be undone."
  if (!(await confirmDialog({ title: `Delete “${f.name}”?`, body, confirmLabel: 'Delete file', danger: true }))) return
  try {
    await api(`/v1/files/${f.id}`, { method: 'DELETE' })
    load()
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur">
    <UserMenu :me="me" />
    <h1 class="text-sm font-medium">Files</h1>
    <div class="ml-auto flex items-center gap-2">
      <label class="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm focus-within:ring-2 focus-within:ring-ring/40">
        <Search class="size-4 text-muted-foreground" />
        <input v-model="query" placeholder="Search files or notes…" aria-label="Search files" class="w-48 bg-transparent outline-none placeholder:text-muted-foreground" />
      </label>
      <Button as="label" size="sm" class="cursor-pointer" :class="uploading && 'pointer-events-none opacity-60'">
        <Upload />{{ uploading ? `Uploading ${Math.round(uploading.progress * 100)}%` : 'Upload' }}
        <input type="file" multiple class="sr-only" :disabled="!!uploading" data-storage-upload @change="onPick" />
      </Button>
    </div>
  </header>

  <main class="mx-auto max-w-5xl p-6">
    <section v-if="storage" class="mb-8 grid gap-2" aria-label="Storage used">
      <div class="flex items-baseline justify-between text-sm">
        <span>{{ formatSize(storage.used) }} of {{ formatSize(storage.quota) }} used</span>
        <span class="text-xs text-muted-foreground">{{ storage.files.length }} file{{ storage.files.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" :aria-valuenow="Math.round(usedPct)" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full transition-all" :class="usedPct > 90 ? 'bg-destructive' : 'bg-primary'" :style="{ width: `${usedPct}%` }" />
      </div>
      <p class="text-xs text-muted-foreground">Per file: videos up to 100 MB, PDFs 15 MB, images and audio 10 MB, anything else 5 MB.</p>
    </section>

    <p v-if="storage && !shown.length" class="py-20 text-center text-sm text-muted-foreground">
      {{ query.trim() ? `No files match “${query.trim()}”.` : 'No files yet. Upload here, or with /file in a note.' }}
    </p>
    <ul v-else class="divide-y rounded-lg border" aria-label="Your files">
      <li v-for="f in shown" :key="f.id" class="flex items-center gap-3 px-3 py-2.5" data-file-row>
        <button type="button" class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted" :aria-label="`Preview ${f.name}`" @click="previewing = f">
          <img v-if="fileKind(f.mime, f.name) === 'image'" :src="f.url" alt="" loading="lazy" class="size-full object-cover" />
          <component :is="KIND_ICON[fileKind(f.mime, f.name)]" v-else class="size-5 text-muted-foreground" />
        </button>
        <div class="grid min-w-0 flex-1 gap-0.5">
          <button type="button" class="truncate text-left text-sm hover:underline" @click="previewing = f">{{ f.name }}</button>
          <p class="truncate text-xs text-muted-foreground">
            {{ formatSize(f.size) }} · {{ ago(f.created_at) }} ·
            <template v-if="f.notes.length || f.hidden_notes">
              <template v-for="(n, i) in f.notes" :key="n.id"><a :href="`/d/${n.id}`" class="text-foreground hover:underline">{{ n.title || 'Untitled' }}</a>{{ i < f.notes.length - 1 ? ', ' : '' }}</template>
              <template v-if="f.hidden_notes">{{ f.notes.length ? ' and ' : '' }}{{ f.hidden_notes }} note{{ f.hidden_notes > 1 ? 's' : '' }} you can't open</template>
            </template>
            <span v-else class="italic">Not in any note</span>
          </p>
        </div>
        <Button as="a" :href="f.url" :download="f.name" variant="ghost" size="icon-sm" aria-label="Download" title="Download"><Download /></Button>
        <Button variant="ghost" size="icon-sm" class="hover:text-destructive" :aria-label="`Delete ${f.name}`" title="Delete" @click="remove(f)"><Trash2 /></Button>
      </li>
    </ul>
  </main>
  <FilePreviewDialog :file="previewing" @close="previewing = null" />
</template>
