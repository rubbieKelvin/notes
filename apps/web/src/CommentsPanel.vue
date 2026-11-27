<script setup lang="ts">
import { MessageSquare, Reply, SmilePlus, Trash2, X } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api, errorText } from './api'
import { ago } from './noteArt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from './ui/feedback'

type Reaction = { emoji: string; count: number; mine: boolean }
type Comment = {
  id: string; parent_id: string | null; author: string; author_username: string | null; guest: boolean
  body: string; created_at: string; can_delete: boolean; reactions: Reaction[]
}
type Thread = { enabled: boolean; can_comment: boolean; can_react: boolean; guest: boolean; owner: boolean; emoji: string[]; comments: Comment[] }

/** One discussion per note. Works signed in (any role) and on public pages, where guests comment with a name. */
const props = defineProps<{ docId: string }>()

const open = ref(false)
const data = ref<Thread>()
const body = ref('')
const guestName = ref(localStorage.getItem('opennotes:guest-name') ?? '')
const replyTo = ref<Comment | null>(null)
const busy = ref(false)
const error = ref('')

async function load() {
  try { data.value = await api<Thread>(`/v1/docs/${props.docId}/comments`) } catch (e) { error.value = errorText(e) }
}
load()
// shortcut: polls while the panel is open; move to the sync socket if threads get busy.
let timer: ReturnType<typeof setInterval> | undefined
watch(open, (o) => { clearInterval(timer); if (o) { load(); timer = setInterval(load, 15000) } })
onBeforeUnmount(() => clearInterval(timer))

const top = computed(() => data.value?.comments.filter((c) => !c.parent_id) ?? [])
const replies = (id: string) => data.value?.comments.filter((c) => c.parent_id === id) ?? []
const count = computed(() => data.value?.comments.length ?? 0)
const signInHref = computed(() => `/signin?next=${encodeURIComponent(location.pathname)}`)

async function run(fn: () => Promise<{ comments: Comment[] }>) {
  error.value = ''
  busy.value = true
  try {
    const r = await fn()
    if (data.value) data.value.comments = r.comments
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}
const post = () => run(async () => {
  if (data.value?.guest) localStorage.setItem('opennotes:guest-name', guestName.value.trim())
  const r = await api<{ comments: Comment[] }>(`/v1/docs/${props.docId}/comments`, {
    body: { body: body.value, parent_id: replyTo.value?.id, guest_name: data.value?.guest ? guestName.value : undefined },
  })
  body.value = ''
  replyTo.value = null
  return r
})
const remove = (c: Comment) => run(() => api(`/v1/comments/${c.id}`, { method: 'DELETE' }))
const react = (c: Comment, emoji: string) => run(() => api(`/v1/comments/${c.id}/reactions`, { body: { emoji } }))

async function setEnabled(on: boolean) {
  try {
    await api(`/v1/docs/${props.docId}/comments-enabled`, { method: 'PUT', body: { enabled: on } })
    await load()
  } catch (e) {
    toast(errorText(e), 'error')
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && body.value.trim()) post()
}
</script>

<template>
  <Button
    v-if="data && (data.enabled || data.owner)" variant="outline" size="sm" class="rounded-full bg-background/85 backdrop-blur"
    :aria-expanded="open" aria-controls="comments-panel" @click="open = !open"
  ><MessageSquare />Comments<span v-if="count" class="tabular-nums text-muted-foreground">{{ count }}</span></Button>

  <aside
    v-if="open && data" id="comments-panel" aria-label="Comments"
    class="fixed top-16 right-3 bottom-3 z-40 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-lg border bg-background"
    @keydown.escape="open = false"
  >
    <header class="flex items-center gap-2 border-b px-4 py-3">
      <h2 class="flex-1 text-base">Comments <span class="text-sm text-muted-foreground tabular-nums">{{ count || '' }}</span></h2>
      <Button variant="ghost" size="icon-sm" aria-label="Close comments" @click="open = false"><X /></Button>
    </header>
    <label v-if="data.owner" class="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm">
      <span>Allow comments<span class="block text-xs text-muted-foreground">{{ data.enabled ? 'Anyone who can open this note can comment.' : 'Off: nobody else sees comments or can add one.' }}</span></span>
      <Switch :model-value="data.enabled" aria-label="Allow comments" @update:model-value="setEnabled(!!$event)" />
    </label>

    <ol class="flex-1 overflow-y-auto px-4 py-2" aria-label="Thread">
      <li v-if="!top.length" class="py-10 text-center text-sm text-muted-foreground">No comments yet.</li>
      <li v-for="c in top" :key="c.id" class="border-b py-3 last:border-b-0" data-comment>
        <template v-for="item in [c, ...replies(c.id)]" :key="item.id">
          <article :class="item.parent_id && 'mt-3 ml-8'" :data-reply="item.parent_id ? '' : undefined">
            <div class="flex items-center gap-2 text-sm">
              <span class="grid size-6 shrink-0 place-items-center rounded-full text-xs uppercase" :class="item.guest ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'">{{ item.author[0] }}</span>
              <span class="truncate">{{ item.author }}</span>
              <span v-if="item.guest" class="text-xs text-muted-foreground">guest</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground" :title="new Date(item.created_at).toLocaleString()">{{ ago(item.created_at) }}</span>
            </div>
            <p class="mt-1 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{{ item.body }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-1">
              <button
                v-for="r in item.reactions" :key="r.emoji" type="button" :disabled="!data.can_react || busy"
                class="flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums disabled:opacity-70" :class="r.mine && 'border-primary/40 bg-primary/10'"
                :aria-pressed="r.mine" :aria-label="`${r.emoji} ${r.count}`" @click="react(item, r.emoji)"
              >{{ r.emoji }} {{ r.count }}</button>
              <Popover v-if="data.can_react && data.enabled">
                <PopoverTrigger as-child><Button variant="ghost" size="icon-xs" aria-label="Add reaction" class="text-muted-foreground"><SmilePlus /></Button></PopoverTrigger>
                <PopoverContent side="top" class="z-[1001] flex w-auto gap-0.5 p-1">
                  <button v-for="e in data.emoji" :key="e" type="button" class="grid size-8 place-items-center rounded-md text-base hover:bg-accent" :aria-label="`React ${e}`" @click="react(item, e)">{{ e }}</button>
                </PopoverContent>
              </Popover>
              <Button v-if="!item.parent_id && data.can_comment" variant="ghost" size="xs" class="text-muted-foreground" @click="replyTo = item"><Reply />Reply</Button>
              <Button v-if="item.can_delete" variant="ghost" size="icon-xs" class="ml-auto text-muted-foreground hover:text-destructive" :aria-label="`Delete comment by ${item.author}`" @click="remove(item)"><Trash2 /></Button>
            </div>
          </article>
        </template>
      </li>
    </ol>

    <form v-if="data.can_comment" class="grid gap-2 border-t p-3" @submit.prevent="post">
      <p v-if="replyTo" class="flex items-center gap-1 text-xs text-muted-foreground">
        Replying to {{ replyTo.author }}<Button type="button" variant="ghost" size="icon-xs" aria-label="Cancel reply" @click="replyTo = null"><X /></Button>
      </p>
      <Input v-if="data.guest" v-model="guestName" placeholder="Your name" aria-label="Your name" maxlength="40" required />
      <Textarea v-model="body" :placeholder="replyTo ? 'Write a reply…' : 'Add a comment…'" aria-label="Comment" rows="2" maxlength="4000" required @keydown="onKey" />
      <p v-if="error" role="alert" class="text-xs text-destructive">{{ error }}</p>
      <div class="flex items-center justify-between gap-2">
        <a v-if="data.guest" :href="signInHref" class="text-xs text-muted-foreground underline underline-offset-2">Sign in to react</a><span v-else />
        <Button type="submit" size="sm" :disabled="busy || !body.trim() || (data.guest && !guestName.trim())">{{ replyTo ? 'Reply' : 'Comment' }}</Button>
      </div>
    </form>
    <p v-else class="border-t p-3 text-center text-xs text-muted-foreground">Comments are turned off.</p>
  </aside>
</template>
