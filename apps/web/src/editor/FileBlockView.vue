<script setup lang="ts">
import { ChevronDown, Download, FolderOpen, LoaderCircle, Maximize2, Search, Trash2 } from '@lucide/vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, ref, watch } from 'vue'
import { api, errorText } from '../api'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import FilePreview from '../FilePreview.vue'
import FilePreviewDialog from '../FilePreviewDialog.vue'
import { ACCEPT, KIND_ICON, fileKind, formatSize, pendingUploads, uploadFile, type FileInfo, type Storage, type StoredFile } from '../files'
import { toast } from '../ui/feedback'
import type { FileBlockOptions } from './FileBlock'

const props = defineProps(nodeViewProps)
const opts = props.extension.options as FileBlockOptions
const a = computed(() => props.node.attrs as { fileId: string | null; name: string; mime: string; size: number; accept: string; open: boolean; upload: string | null })
const file = computed(() => (a.value.fileId ? { url: `/v1/files/${a.value.fileId}`, name: a.value.name, mime: a.value.mime, size: Number(a.value.size) } : null))
const kind = computed(() => fileKind(a.value.mime, a.value.name))
const label = computed(() => ({ image: 'an image', video: 'a video', audio: 'an audio file', pdf: 'a PDF' })[a.value.accept] ?? 'a file')

// ── upload slot ──
const progress = ref<number | null>(null)
const uploadingName = ref('')
const dragging = ref(false)

const place = (f: FileInfo) => props.updateAttributes({ fileId: f.id, name: f.name, mime: f.mime, size: f.size, upload: null })

async function upload(f: File | undefined) {
  if (!f || progress.value !== null) return
  uploadingName.value = f.name
  progress.value = 0
  try {
    place(await uploadFile(f, { doc: opts.docId, onProgress: (p) => (progress.value = p) }))
  } catch (e) {
    toast(errorText(e), 'error')
    if (a.value.upload) props.deleteNode() // a failed drop or paste leaves nothing behind
  } finally {
    progress.value = null
  }
}
function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  upload(input.files?.[0])
  input.value = ''
}

// ── pick from storage ──
const stored = ref<StoredFile[]>()
const query = ref('')
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (stored.value ?? []).filter((f) => (a.value.accept === 'file' || fileKind(f.mime, f.name) === a.value.accept) && f.name.toLowerCase().includes(q))
})
async function loadStored(open: boolean) {
  if (!open) return
  try {
    stored.value = (await api<Storage>('/v1/files')).files
  } catch (e) {
    toast(errorText(e), 'error')
  }
}

// ── placed file ──
const missing = ref(false)
const showing = computed(() => a.value.open && !missing.value && kind.value !== 'file')
// Images, video, PDFs and text fill a box and float the name and controls inside it on hover. Audio keeps its
// name visible above the player (a bare player doesn't say what it is); other files are a compact row.
const boxed = computed(() => showing.value && kind.value !== 'audio')
const audio = computed(() => showing.value && kind.value === 'audio')
const hugs = computed(() => kind.value === 'image' || kind.value === 'video')
const overlay = 'absolute top-2 z-10 flex items-center gap-2 rounded-md bg-background/90 text-sm shadow-sm backdrop-blur transition-opacity '
  + 'opacity-0 group-hover/file:opacity-100 group-focus-within/file:opacity-100 [@media(hover:none)]:opacity-100'
const fullscreen = ref(false)
// A watch, not onMounted: ProseMirror may reuse this view for a newly inserted block.
watch(() => a.value.upload, (key) => {
  const dropped = key && pendingUploads.get(key)
  if (!dropped) return
  pendingUploads.delete(key)
  upload(dropped)
}, { immediate: true })
watch(() => file.value?.url, async (url) => {
  missing.value = false
  if (!url) return
  // Deleted from storage, or the note's readers lost access: say so instead of a broken preview.
  const res = await fetch(url, { method: 'HEAD' }).catch(() => null)
  missing.value = res?.status === 404
}, { immediate: true })
</script>

<template>
  <NodeViewWrapper class="not-prose my-4" data-type="file-block" :hidden="!file && opts.readOnly">
    <!-- upload slot -->
    <div
      v-if="!file && !opts.readOnly" contenteditable="false"
      class="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors"
      :class="dragging && 'border-primary bg-primary/5 text-primary'"
      @dragover.prevent.stop="dragging = true" @dragleave.stop="dragging = false" @drop.prevent.stop="dragging = false; upload($event.dataTransfer?.files[0])"
    >
      <template v-if="progress !== null">
        <LoaderCircle class="size-4 shrink-0 animate-spin" />
        <span class="min-w-0 flex-1 truncate">{{ uploadingName }}</span>
        <span class="font-mono text-xs tabular-nums">{{ Math.round(progress * 100) }}%</span>
      </template>
      <template v-else>
        <component :is="KIND_ICON[(a.accept as keyof typeof KIND_ICON)] ?? KIND_ICON.file" class="size-4 shrink-0" />
        <label class="flex-1 cursor-pointer hover:text-foreground">
          Upload or drop {{ label }}
          <input type="file" class="sr-only" :accept="ACCEPT[a.accept] ?? ''" data-file-input @change="onPick" />
        </label>
        <Popover @update:open="loadStored">
          <PopoverTrigger as-child>
            <Button variant="ghost" size="sm"><FolderOpen />Your files</Button>
          </PopoverTrigger>
          <PopoverContent align="end" class="w-80 p-0">
            <label class="flex items-center gap-2 border-b px-3 py-2 text-sm">
              <Search class="size-4 text-muted-foreground" />
              <input v-model="query" placeholder="Search your files…" aria-label="Search your files" class="flex-1 bg-transparent outline-none" />
            </label>
            <ul class="max-h-72 overflow-y-auto p-1" aria-label="Your files">
              <li v-if="!stored" class="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</li>
              <li v-else-if="!matches.length" class="px-2 py-6 text-center text-xs text-muted-foreground">No matching files.</li>
              <li v-for="f in matches" :key="f.id">
                <button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" @click="place(f)">
                  <component :is="KIND_ICON[fileKind(f.mime, f.name)]" class="size-4 shrink-0 text-muted-foreground" />
                  <span class="min-w-0 flex-1 truncate">{{ f.name }}</span>
                  <span class="text-xs text-muted-foreground">{{ formatSize(f.size) }}</span>
                </button>
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      </template>
    </div>

    <!-- placed file: a preview box with the name and controls floating inside it on hover, or a compact row -->
    <div
      v-else-if="file" contenteditable="false" data-file-block
      class="group/file relative overflow-hidden rounded-md border"
      :class="boxed ? (hugs ? 'mx-auto grid min-h-12 w-fit max-w-full min-w-80 place-items-center' : '') : 'flex flex-wrap items-center gap-x-2 px-3 py-1.5 text-sm'"
    >
      <div :class="boxed ? `${overlay} left-2 max-w-[calc(100%-10rem)] px-2 py-1` : 'flex min-w-0 flex-1 items-center gap-2'" data-file-name>
        <component :is="KIND_ICON[kind]" class="size-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0 truncate" :title="file.name">{{ file.name }}</span>
        <span v-if="missing" class="text-xs text-destructive">Deleted</span>
        <span v-else class="shrink-0 font-mono text-xs text-muted-foreground">{{ formatSize(file.size) }}</span>
      </div>
      <div :class="boxed ? `${overlay} right-2 p-0.5` : 'flex items-center'" data-file-controls>
        <template v-if="!missing">
          <Button variant="ghost" size="icon-sm" aria-label="Open preview" title="Open" @click="fullscreen = true"><Maximize2 /></Button>
          <Button as="a" :href="file.url" :download="file.name" variant="ghost" size="icon-sm" aria-label="Download" title="Download"><Download /></Button>
          <Button v-if="kind !== 'file' && !opts.readOnly" variant="ghost" size="icon-sm" :aria-label="a.open ? 'Hide preview' : 'Show preview'" :aria-expanded="a.open" @click="updateAttributes({ open: !a.open })">
            <ChevronDown class="transition-transform" :class="!a.open && '-rotate-90'" />
          </Button>
        </template>
        <Button v-if="!opts.readOnly" variant="ghost" size="icon-sm" aria-label="Remove from note" title="Remove from note (stays in your files)" @click="deleteNode()"><Trash2 /></Button>
      </div>
      <FilePreview v-if="boxed || audio" v-bind="file" :class="audio && 'mt-1 mb-0.5 basis-full'" />
    </div>
    <FilePreviewDialog :file="fullscreen ? file : null" @close="fullscreen = false" />
  </NodeViewWrapper>
</template>
