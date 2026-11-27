<script setup lang="ts">
import { Check, Copy, ExternalLink, Globe, Link2, Users, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { api, displayName, errorText, type DocInfo, type Me } from './api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from './ui/feedback'

type Share = { email: string; role: 'view' | 'edit'; name: string | null }
/** title: the live title from the open document (doc.title is the list's copy and can lag). */
const props = defineProps<{ doc: DocInfo; me: Me; title: string }>()

const open = ref(false)
const shares = ref<Share[]>([])
const isPublic = ref(props.doc.is_public)
const email = ref('')
const role = ref<'view' | 'edit'>('view')
const busy = ref(false)
const error = ref('')
const ROLES = [{ id: 'view', label: 'Can view' }, { id: 'edit', label: 'Can edit' }] as const

watch(open, async (o) => {
  if (!o) return
  error.value = ''
  try {
    const r = await api<{ shares: Share[]; is_public: boolean }>(`/v1/docs/${props.doc.id}/shares`)
    shares.value = r.shares
    isPublic.value = r.is_public
  } catch (e) {
    error.value = errorText(e)
  }
})

async function run(fn: () => Promise<void>) {
  error.value = ''
  busy.value = true
  try { await fn() } catch (e) { error.value = errorText(e) } finally { busy.value = false }
}
const invite = () => run(async () => {
  const added = email.value.trim()
  shares.value = (await api<{ shares: Share[] }>(`/v1/docs/${props.doc.id}/shares`, { body: { email: added, role: role.value } })).shares
  email.value = ''
  toast(`Shared with ${added}`)
})
const setRole = (s: Share, r: 'view' | 'edit') => run(async () => {
  shares.value = (await api<{ shares: Share[] }>(`/v1/docs/${props.doc.id}/shares`, { body: { email: s.email, role: r } })).shares
})
const remove = (s: Share) => run(async () => {
  shares.value = (await api<{ shares: Share[] }>(`/v1/docs/${props.doc.id}/shares/${encodeURIComponent(s.email)}`, { method: 'DELETE' })).shares
})
const togglePublic = () => run(async () => {
  isPublic.value = (await api<{ is_public: boolean }>(`/v1/docs/${props.doc.id}/public`, { method: 'PUT', body: { public: !isPublic.value } })).is_public
})

const noteLink = `${location.origin}/d/${props.doc.id}`
const publicLink = computed(() => `${location.origin}/public/@${props.me.username}/${props.doc.id}`)
const profileLink = computed(() => `${location.origin}/public/@${props.me.username}`)
const copied = ref('')
async function copy(key: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => copied.value === key && (copied.value = ''), 1500)
}
const roleLabel = (r: string) => ROLES.find((x) => x.id === r)?.label ?? r
</script>

<template>
  <Button variant="outline" size="sm" class="rounded-full bg-background/85 backdrop-blur" :class="(shares.length || isPublic) ? 'text-foreground' : 'text-muted-foreground'" @click="open = true">
    <Globe v-if="isPublic" /><Users v-else />Share
  </Button>

  <Dialog v-model:open="open">
    <DialogContent class="grid-cols-1 gap-5 sm:max-w-lg [&>*]:min-w-0">
      <DialogHeader>
        <DialogTitle>Share “{{ title || 'Untitled' }}”</DialogTitle>
        <DialogDescription>Invite people by email. Anyone without an account signs up with a code we email them.</DialogDescription>
      </DialogHeader>

      <form class="flex min-w-0 gap-2" @submit.prevent="invite">
        <Input v-model="email" type="email" required placeholder="name@example.com" aria-label="Email to share with" class="min-w-0 flex-1" />
        <Select v-model="role">
          <SelectTrigger class="w-32" aria-label="Access for new person"><SelectValue /></SelectTrigger>
          <SelectContent class="z-[1001]">
            <SelectItem v-for="r in ROLES" :key="r.id" :value="r.id">{{ r.label }}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" :disabled="busy || !email.trim()">Invite</Button>
      </form>
      <p v-if="error" role="alert" class="-mt-3 text-xs text-destructive">{{ error }}</p>

      <section class="grid gap-1" aria-label="People with access">
        <p class="text-xs text-muted-foreground">People with access</p>
        <ul class="grid gap-0.5">
          <li class="flex items-center gap-3 rounded-md px-1 py-1.5">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-ai-100 text-sm uppercase text-ai-700">{{ displayName(me)[0] }}</span>
            <span class="grid min-w-0 flex-1 text-sm"><span class="truncate">{{ displayName(me) }} (you)</span><span class="truncate text-xs text-muted-foreground">{{ me.email }}</span></span>
            <span class="pr-2 text-xs text-muted-foreground">Owner</span>
          </li>
          <li v-for="s in shares" :key="s.email" class="flex items-center gap-3 rounded-md px-1 py-1.5" data-share>
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm uppercase text-muted-foreground">{{ (s.name ?? s.email)[0] }}</span>
            <span class="grid min-w-0 flex-1 text-sm">
              <span class="truncate">{{ s.name ?? s.email }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ s.name ? s.email : 'Invite sent · no account yet' }}</span>
            </span>
            <Select :model-value="s.role" @update:model-value="setRole(s, $event as 'view' | 'edit')">
              <SelectTrigger size="sm" class="w-28 border-0" :aria-label="`Access for ${s.email}`"><SelectValue>{{ roleLabel(s.role) }}</SelectValue></SelectTrigger>
              <SelectContent class="z-[1001]">
                <SelectItem v-for="r in ROLES" :key="r.id" :value="r.id">{{ r.label }}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon-xs" :aria-label="`Remove ${s.email}`" :title="`Remove ${s.email}`" @click="remove(s)"><X /></Button>
          </li>
        </ul>
        <Button variant="ghost" size="xs" class="justify-self-start text-muted-foreground" @click="copy('note', noteLink)">
          <Check v-if="copied === 'note'" /><Link2 v-else />{{ copied === 'note' ? 'Copied' : 'Copy link for invited people' }}
        </Button>
      </section>

      <section class="grid grid-cols-1 gap-3 border-t pt-4 [&>*]:min-w-0">
        <div class="flex items-center gap-3">
          <span class="grid size-8 shrink-0 place-items-center rounded-full" :class="isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'"><Globe class="size-4" /></span>
          <Label for="public-switch" class="grid flex-1 gap-0.5">
            <span>Publish to the web</span>
            <span class="text-xs font-normal text-muted-foreground">{{ isPublic ? 'Anyone with the link can view. Listed on your public profile.' : 'Only you and the people above can open it.' }}</span>
          </Label>
          <Switch id="public-switch" :model-value="isPublic" :disabled="busy" class="data-[state=checked]:bg-emerald-600" @update:model-value="togglePublic" />
        </div>
        <template v-if="isPublic">
          <div class="flex items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-3 text-xs">
            <code class="min-w-0 flex-1 truncate" data-public-link>{{ publicLink }}</code>
            <Button variant="ghost" size="icon-xs" :aria-label="copied === 'public' ? 'Copied' : 'Copy public link'" @click="copy('public', publicLink)"><Check v-if="copied === 'public'" /><Copy v-else /></Button>
            <Button as="a" :href="publicLink" target="_blank" variant="ghost" size="icon-xs" aria-label="Open public page"><ExternalLink /></Button>
          </div>
          <p class="text-xs [overflow-wrap:anywhere] text-muted-foreground">Your profile: <a :href="profileLink" target="_blank" class="underline underline-offset-2">{{ profileLink.replace(/^https?:\/\//, '') }}</a> · change your username in Settings → Profile.</p>
        </template>
      </section>
    </DialogContent>
  </Dialog>
</template>
