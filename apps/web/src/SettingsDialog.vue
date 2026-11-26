<script setup lang="ts">
import { KeyRound, Sparkles } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { api, errorText, type AiSettings, type Me } from './api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { confirmDialog, toast } from './ui/feedback'

type Token = { id: string; name: string; scopes: string[]; last_used_at: string | null; created_at: string }
const props = defineProps<{ me: Me }>()
const open = ref(false)
watch(open, (o) => o || (newToken.value = ''))

const providers = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek (text only)' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'custom', label: 'Custom (OpenAI-compatible URL)' },
]
const ai = ref<AiSettings | null>(props.me.ai)
const provider = ref(ai.value?.provider ?? 'anthropic')
const baseUrl = ref(ai.value?.base_url ?? '')
const keyInput = ref('')
const models = ref<string[]>([])
const model = ref(ai.value?.model ?? '')
const aiError = ref('')
const aiBusy = ref(false)
const keepsSavedKey = computed(() => !!ai.value?.key_hint && ai.value.provider === provider.value)
const body = () => ({ provider: provider.value, base_url: provider.value === 'custom' ? baseUrl.value : undefined, key: keyInput.value || undefined, model: model.value })

watch(provider, () => { models.value = []; model.value = provider.value === ai.value?.provider ? ai.value.model : ''; aiError.value = '' })

async function run(fn: () => Promise<void>) {
  aiError.value = ''
  aiBusy.value = true
  try { await fn() } catch (e) { aiError.value = errorText(e) } finally { aiBusy.value = false }
}
const loadModels = () => run(async () => {
  models.value = (await api<{ models: string[] }>('/v1/settings/ai/models', { body: body() })).models
  if (!models.value.includes(model.value)) model.value = models.value[0] ?? ''
})
const saveAi = () => run(async () => {
  ai.value = await api<AiSettings>('/v1/settings/ai', { method: 'PUT', body: body() })
  keyInput.value = ''
  toast('AI provider saved')
})
const removeAi = () => run(async () => {
  await api('/v1/settings/ai', { method: 'DELETE' })
  ai.value = null
})
const label = (id: string) => providers.find((p) => p.id === id)?.label ?? id

const tokens = ref<Token[]>([])
const tokenName = ref('')
const tokenScopes = ref<string[]>(['ingest'])
const toggleScope = (s: string, on: boolean | 'indeterminate') => (tokenScopes.value = on === true ? [...tokenScopes.value, s] : tokenScopes.value.filter((x) => x !== s))
const newToken = ref('')
const tokenError = ref('')

async function show() {
  open.value = true
  tokens.value = await api<Token[]>('/v1/tokens').catch(() => [])
}
defineExpose({ show })

async function createToken() {
  tokenError.value = ''
  try {
    newToken.value = (await api<{ token: string }>('/v1/tokens', { body: { name: tokenName.value, scopes: tokenScopes.value } })).token
    tokenName.value = ''
    tokens.value = await api<Token[]>('/v1/tokens')
  } catch (e) {
    tokenError.value = errorText(e)
  }
}

async function revoke(t: Token) {
  if (!(await confirmDialog({ title: `Revoke “${t.name}”?`, body: 'Anything using this token stops working right away.', confirmLabel: 'Revoke', danger: true }))) return
  try {
    await api(`/v1/tokens/${t.id}`, { method: 'DELETE' })
    tokens.value = tokens.value.filter((x) => x.id !== t.id)
    toast('Token revoked')
  } catch (e) {
    toast(errorText(e), 'error')
  }
}

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString() : 'never')
const origin = location.origin
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
      <DialogHeader class="border-b px-6 py-4">
        <DialogTitle>Settings</DialogTitle>
      </DialogHeader>

      <section class="grid gap-3 px-6 py-5">
        <div class="flex items-start gap-3">
          <span class="grid size-8 shrink-0 place-items-center rounded-md bg-ai-50 text-ai-500"><Sparkles class="size-4" /></span>
          <div>
            <h3 class="font-semibold">AI provider</h3>
            <p class="text-xs text-muted-foreground">Margin notes and canvas annotations run on your own account with the provider you choose. Keys are stored encrypted and never sent back to the browser.</p>
          </div>
        </div>
        <div v-if="ai" class="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
          <span class="truncate"><span class="font-medium">{{ label(ai.provider) }}</span> · <code>{{ ai.model }}</code><template v-if="ai.key_hint"> · key <code>••••{{ ai.key_hint }}</code></template></span>
          <Button variant="link" size="xs" class="text-destructive" @click="removeAi">Remove</Button>
        </div>
        <form class="grid gap-2" @submit.prevent="saveAi">
          <Select v-model="provider">
            <SelectTrigger class="w-full" aria-label="Provider"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in providers" :key="p.id" :value="p.id">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <Input v-if="provider === 'custom'" v-model="baseUrl" placeholder="https://api.example.com/v1" aria-label="Base URL" />
          <Input
            v-model="keyInput" type="password" autocomplete="off" aria-label="API key"
            :placeholder="keepsSavedKey ? 'Leave blank to keep your saved key' : provider === 'custom' ? 'API key (optional for local servers)' : 'API key'"
          />
          <div class="flex gap-2">
            <Input v-model="model" list="ai-models" placeholder="Model" aria-label="Model" />
            <datalist id="ai-models"><option v-for="m in models" :key="m" :value="m" /></datalist>
            <Button type="button" variant="outline" :disabled="aiBusy" @click="loadModels">Load models</Button>
            <Button type="submit" :disabled="aiBusy || !model">{{ aiBusy ? 'Checking…' : 'Save' }}</Button>
          </div>
          <p v-if="models.length" class="text-xs text-muted-foreground">{{ models.length }} models available. Pick one above.</p>
        </form>
        <p v-if="aiError" role="alert" class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{{ aiError }}</p>
      </section>

      <Separator />

      <section class="grid gap-3 px-6 py-5">
        <div class="flex items-start gap-3">
          <span class="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><KeyRound class="size-4" /></span>
          <div>
            <h3 class="font-semibold">API tokens</h3>
            <p class="text-xs text-muted-foreground"><em>ingest</em> lets scripts and <code>opennotes push</code> drop notes in your AI inbox. <em>mcp</em> lets agents read pages you expose.</p>
          </div>
        </div>
        <ul v-if="tokens.length" class="divide-y rounded-md border">
          <li v-for="t in tokens" :key="t.id" class="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ t.name }}</span>
              <span class="block text-xs text-muted-foreground">{{ t.scopes.join(', ') }} · last used {{ date(t.last_used_at) }}</span>
            </span>
            <Button variant="link" size="xs" class="text-destructive" @click="revoke(t)">Revoke</Button>
          </li>
        </ul>
        <form class="grid gap-2" @submit.prevent="createToken">
          <Input v-model="tokenName" placeholder="Token name, e.g. laptop CLI" aria-label="Token name" />
          <div class="flex items-center gap-4">
            <div v-for="s in ['ingest', 'mcp']" :key="s" class="flex items-center gap-1.5">
              <Checkbox :id="`scope-${s}`" :model-value="tokenScopes.includes(s)" @update:model-value="toggleScope(s, $event)" />
              <Label :for="`scope-${s}`" class="font-normal">{{ s }}</Label>
            </div>
            <Button type="submit" variant="outline" class="ml-auto" :disabled="!tokenName || !tokenScopes.length">Create token</Button>
          </div>
        </form>
        <p v-if="tokenError" role="alert" class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{{ tokenError }}</p>
        <div v-if="newToken" class="grid gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <div class="font-medium text-emerald-800">Copy it now; it won't be shown again.</div>
          <code class="block break-all rounded-sm border bg-background px-2 py-1.5 select-all">{{ newToken }}</code>
          <div class="text-muted-foreground">CLI: <code>OPENNOTES_URL={{ origin }} OPENNOTES_TOKEN=… opennotes push &lt; error.log</code></div>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
