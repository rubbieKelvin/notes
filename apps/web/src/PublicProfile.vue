<script setup lang="ts">
import { ref } from 'vue'
import { api, ApiError, errorText } from './api'
import { ago, noteArt } from './noteArt'
import { Button } from '@/components/ui/button'

/** /public/@username: someone's public notes. Exists only while they have at least one. */
const props = defineProps<{ username: string }>()
type Profile = { name: string; username: string; notes: { id: string; title: string; description: string; updated_at: string }[] }

const profile = ref<Profile>()
const missing = ref(false)
const error = ref('')
api<Profile>(`/v1/public/@${props.username}`)
  .then((p) => { profile.value = p; document.title = `${p.name} (@${p.username})` })
  .catch((e) => (e instanceof ApiError && e.status === 404 ? (missing.value = true) : (error.value = errorText(e))))
</script>

<template>
  <header class="flex justify-end px-4 py-3"><Button as="a" href="/" variant="ghost" size="sm">opennotes</Button></header>
  <main v-if="profile" class="mx-auto max-w-5xl px-6 pb-24">
    <section class="flex items-center gap-5 py-10">
      <span class="grid size-20 shrink-0 place-items-center rounded-full bg-ai-100 text-3xl uppercase text-ai-700">{{ profile.name[0] }}</span>
      <div>
        <h1 class="text-3xl tracking-tight">{{ profile.name }}</h1>
        <p class="text-muted-foreground">@{{ profile.username }} · {{ profile.notes.length }} public {{ profile.notes.length === 1 ? 'note' : 'notes' }}</p>
      </div>
    </section>
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4" aria-label="Public notes">
      <li v-for="n in profile.notes" :key="n.id">
        <a :href="`/public/@${profile.username}/${n.id}`" class="group block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" data-note-card>
          <div class="grid h-32 place-items-center" :style="{ background: noteArt(n.id).bg }" aria-hidden="true">
            <component :is="noteArt(n.id).icon" class="size-10 transition-transform group-hover:scale-110" :style="{ color: noteArt(n.id).fg }" :stroke-width="1.5" />
          </div>
          <div class="grid gap-1 p-3">
            <h2 class="truncate text-sm font-medium">{{ n.title || 'Untitled' }}</h2>
            <p class="line-clamp-2 min-h-8 text-xs" :class="n.description ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'">{{ n.description || 'No description' }}</p>
            <p class="text-[11px] text-muted-foreground">Updated {{ ago(n.updated_at) }}</p>
          </div>
        </a>
      </li>
    </ul>
  </main>
  <main v-else-if="missing" class="grid min-h-[70vh] place-items-center px-6 text-center" role="alert">
    <div>
      <h1 class="text-xl">Nothing public here</h1>
      <p class="mt-2 text-sm text-muted-foreground">@{{ username }} hasn't published any notes, or doesn't exist.</p>
    </div>
  </main>
  <p v-else-if="error" role="alert" class="p-8 text-sm text-destructive">Couldn't load this profile: {{ error }}</p>
</template>
