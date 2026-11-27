<script setup lang="ts">
import { Bot, Check, Copy, KeyRound, Plug } from '@lucide/vue'
import { computed, ref } from 'vue'
import { api, errorText, type DocInfo } from './api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from './ui/feedback'

const props = defineProps<{ doc: DocInfo }>()
const open = ref(false)
const slug = ref(props.doc.mcp_exposed_slug)
const error = ref('')
const busy = ref(false)
const endpoint = `${location.origin}/mcp`

const clients = {
  'Claude Code': computed(() => `claude mcp add --transport http opennotes ${endpoint} \\\n  --header "Authorization: Bearer <your mcp token>"`),
  'JSON config': computed(() => JSON.stringify({ mcpServers: { opennotes: { type: 'http', url: endpoint, headers: { Authorization: 'Bearer <your mcp token>' } } } }, null, 2)),
}
const client = ref<keyof typeof clients>('Claude Code')
const TOOLS = [
  { name: 'list_documents', what: 'see the notes you shared' },
  { name: 'read_document', what: 'read one, with margin notes and canvas text' },
  { name: 'push_note', what: 'suggest a note; it lands in your inbox, never on the page' },
]

const copied = ref('')
async function copy(key: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => copied.value === key && (copied.value = ''), 1500)
}

async function toggle() {
  error.value = ''
  busy.value = true
  try {
    slug.value = (await api<{ mcp_exposed_slug: string | null }>(`/v1/docs/${props.doc.id}/mcp`, { method: 'PUT', body: { enabled: !slug.value } })).mcp_exposed_slug
  } catch (e) {
    error.value = errorText(e)
    toast(error.value, 'error')
  } finally {
    busy.value = false
  }
}

function openSettings() {
  open.value = false
  window.dispatchEvent(new Event('opennotes:settings'))
}
</script>

<template>
  <Button
    variant="outline" size="sm" class="rounded-full bg-background/85 backdrop-blur" :class="slug ? 'text-emerald-700 hover:text-emerald-800' : 'text-muted-foreground'"
    @click="open = true"
  >
    <span v-if="slug" class="size-2 rounded-full bg-emerald-500" /><Plug v-else />MCP{{ slug ? ': Live' : '' }}
  </Button>

  <Dialog v-model:open="open">
    <DialogContent class="gap-5 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><Bot class="size-5" />Agent access</DialogTitle>
        <DialogDescription>Let AI agents such as Claude Code read this note through your MCP endpoint. Read-only: they can never change the page.</DialogDescription>
      </DialogHeader>

      <div class="flex items-center gap-3 rounded-lg border p-3" :class="slug && 'border-emerald-200 bg-emerald-50/60'">
        <span class="size-2.5 shrink-0 rounded-full" :class="slug ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-muted-foreground/40'" />
        <Label for="mcp-switch" class="grid flex-1 gap-0.5">
          <span>Let my agents read this page</span>
          <span class="text-xs font-normal text-muted-foreground">
            <template v-if="slug">Live as <code class="rounded-sm bg-background px-1 text-foreground">{{ slug }}</code></template>
            <template v-else>Off. Agents can't see this note.</template>
          </span>
        </Label>
        <Button v-if="slug" variant="ghost" size="icon-xs" :aria-label="copied === 'slug' ? 'Copied' : 'Copy note id'" title="Copy note id" @click="copy('slug', slug)">
          <Check v-if="copied === 'slug'" /><Copy v-else />
        </Button>
        <Switch id="mcp-switch" :model-value="!!slug" :disabled="busy" class="data-[state=checked]:bg-emerald-600" @update:model-value="toggle" />
      </div>
      <p v-if="error" role="alert" class="-mt-3 text-xs text-destructive">{{ error }}</p>

      <ol v-if="slug" class="grid gap-4 text-sm">
        <li class="grid grid-cols-[1.5rem_1fr] gap-x-2">
          <span class="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium">1</span>
          <div class="grid gap-1.5">
            <p class="font-medium">Create a token with the <code class="rounded-sm bg-muted px-1">mcp</code> scope</p>
            <Button variant="outline" size="xs" class="justify-self-start" @click="openSettings"><KeyRound />Open Settings → API tokens</Button>
          </div>
        </li>
        <li class="grid grid-cols-[1.5rem_1fr] gap-x-2">
          <span class="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium">2</span>
          <div class="grid min-w-0 gap-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium">Add the server to your agent</p>
              <div class="flex rounded-md bg-muted p-0.5 text-xs" role="tablist" aria-label="Agent">
                <button
                  v-for="(_, name) in clients" :key="name" type="button" role="tab" :aria-selected="client === name"
                  class="rounded px-2 py-0.5" :class="client === name ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'"
                  @click="client = name"
                >{{ name }}</button>
              </div>
            </div>
            <div class="relative rounded-md bg-primary p-3 pr-10 font-mono text-[11px] leading-relaxed text-primary-foreground">
              <pre class="overflow-x-auto whitespace-pre-wrap break-all">{{ clients[client].value }}</pre>
              <Button
                variant="ghost" size="icon-xs" class="absolute top-2 right-2 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
                :aria-label="copied === 'cmd' ? 'Copied' : 'Copy command'" @click="copy('cmd', clients[client].value)"
              ><Check v-if="copied === 'cmd'" /><Copy v-else /></Button>
            </div>
            <p class="text-xs text-muted-foreground">Replace <code>&lt;your mcp token&gt;</code> with the token from step 1.</p>
          </div>
        </li>
        <li class="grid grid-cols-[1.5rem_1fr] gap-x-2">
          <span class="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium">3</span>
          <div class="grid gap-1.5">
            <p class="font-medium">Your agent can now</p>
            <ul class="grid gap-1 text-xs">
              <li v-for="t in TOOLS" :key="t.name"><code class="rounded-sm bg-muted px-1 text-foreground">{{ t.name }}</code> <span class="text-muted-foreground">{{ t.what }}</span></li>
            </ul>
          </div>
        </li>
      </ol>
    </DialogContent>
  </Dialog>
</template>
