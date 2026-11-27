<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, ref } from 'vue'
import * as Y from 'yjs'
import { api, ApiError, errorText } from './api'
import { noteExtensions } from './editor/extensions'
import { canvasesOf } from './editor/canvas/store'
import { ago } from './noteArt'
import { Button } from '@/components/ui/button'
import CommentsPanel from './CommentsPanel.vue'
import NoteReactions from './NoteReactions.vue'

/** A public note, read-only, for anyone (no account needed). */
const props = defineProps<{ username: string; id: string }>()
type PublicNote = { note: { title: string; description: string; updated_at: string }; owner: { name: string; username: string }; state: string }

const data = ref<PublicNote>()
const missing = ref(false)
const error = ref('')
const ydoc = new Y.Doc()
canvasesOf(ydoc)
const editor = useEditor({ editable: false, editorProps: { attributes: { class: 'prose prose-stone max-w-none' } }, extensions: noteExtensions({ ydoc, provider: null, docId: props.id, readOnly: true, editor: () => editor.value }) })

api<PublicNote>(`/v1/public/@${props.username}/${props.id}`)
  .then((d) => {
    Y.applyUpdate(ydoc, Uint8Array.from(atob(d.state), (c) => c.charCodeAt(0)))
    data.value = d
    document.title = `${d.note.title || 'Untitled'} · ${d.owner.name}`
  })
  .catch((e) => (e instanceof ApiError && e.status === 404 ? (missing.value = true) : (error.value = errorText(e))))

onBeforeUnmount(() => { editor.value?.destroy(); ydoc.destroy() })
</script>

<template>
  <header class="flex items-center justify-between px-4 py-3 text-sm">
    <a v-if="data" :href="`/public/@${data.owner.username}`" class="flex items-center gap-2 rounded-full py-0.5 pr-3 pl-0.5 hover:bg-accent">
      <span class="grid size-7 place-items-center rounded-full bg-primary/10 text-xs uppercase text-primary">{{ data.owner.name[0] }}</span>
      <span>{{ data.owner.name }}</span><span class="text-muted-foreground">@{{ data.owner.username }}</span>
    </a>
    <span v-else />
    <div class="flex items-center gap-2">
      <CommentsPanel v-if="data" :doc-id="id" />
      <Button as="a" href="/" variant="ghost" size="sm">opennotes</Button>
    </div>
  </header>

  <main v-if="data" class="mx-auto max-w-[44rem] px-6 pt-12 pb-24">
    <h1 class="text-4xl tracking-tight">{{ data.note.title || 'Untitled' }}</h1>
    <p v-if="data.note.description" class="mt-3 text-lg text-muted-foreground">{{ data.note.description }}</p>
    <p class="mt-4 text-xs text-muted-foreground">Updated {{ ago(data.note.updated_at) }}</p>
    <NoteReactions class="mt-4 mb-10" :doc-id="id" />
    <EditorContent :editor="editor" />
  </main>
  <main v-else-if="missing" class="grid min-h-[70vh] place-items-center px-6 text-center" role="alert">
    <div>
      <h1 class="text-xl">This note isn't public</h1>
      <p class="mt-2 text-sm text-muted-foreground">It may have been unpublished or deleted, or the link is wrong.</p>
    </div>
  </main>
  <p v-else-if="error" role="alert" class="p-8 text-sm text-destructive">Couldn't load this note: {{ error }}</p>
</template>
