<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api, errorText, type AiSettings, type Me } from './api'

type Token = { id: string; name: string; scopes: string[]; last_used_at: string | null; created_at: string }
const props = defineProps<{ me: Me }>()
const dialog = ref<HTMLDialogElement>()

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
})
const removeAi = () => run(async () => {
  await api('/v1/settings/ai', { method: 'DELETE' })
  ai.value = null
})
const label = (id: string) => providers.find((p) => p.id === id)?.label ?? id

const tokens = ref<Token[]>([])
const tokenName = ref('')
const tokenScopes = ref<string[]>(['ingest'])
const newToken = ref('')
const tokenError = ref('')

async function show() {
  dialog.value?.showModal()
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
  if (!confirm(`Revoke “${t.name}”? Anything using it stops working.`)) return
  await api(`/v1/tokens/${t.id}`, { method: 'DELETE' })
  tokens.value = tokens.value.filter((x) => x.id !== t.id)
}

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString() : 'never')
const origin = location.origin
const input = 'w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm outline-none focus:border-stone-400'
</script>

<template>
  <dialog ref="dialog" class="m-auto w-full max-w-lg rounded-xl border border-stone-200 p-0 text-sm text-stone-700 shadow-xl backdrop:bg-stone-900/20" @close="newToken = ''">
    <div class="space-y-6 p-5">
      <header class="flex items-center justify-between">
        <h2 class="text-base font-medium">Settings</h2>
        <button class="text-stone-400 hover:text-stone-900" aria-label="Close" @click="dialog?.close()">✕</button>
      </header>

      <section class="space-y-2">
        <h3 class="font-medium">AI provider</h3>
        <p class="text-xs text-stone-500">Margin notes and canvas annotations run on your own account with the provider you choose. Keys are stored encrypted and never sent back to the browser.</p>
        <div v-if="ai" class="flex items-center justify-between gap-2 rounded-md bg-stone-50 px-2.5 py-1.5">
          <span class="truncate">{{ label(ai.provider) }} · <code>{{ ai.model }}</code><template v-if="ai.key_hint"> · key <code>••••{{ ai.key_hint }}</code></template></span>
          <button class="shrink-0 text-xs text-red-700 hover:underline" @click="removeAi">Remove</button>
        </div>
        <form class="space-y-2" @submit.prevent="saveAi">
          <select v-model="provider" :class="input" aria-label="Provider">
            <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
          <input v-if="provider === 'custom'" v-model="baseUrl" :class="input" placeholder="https://api.example.com/v1" aria-label="Base URL" />
          <input
            v-model="keyInput" type="password" autocomplete="off" :class="input" aria-label="API key"
            :placeholder="keepsSavedKey ? 'Leave blank to keep your saved key' : provider === 'custom' ? 'API key (optional for local servers)' : 'API key'"
          />
          <div class="flex gap-2">
            <input v-model="model" list="ai-models" :class="input" placeholder="Model" aria-label="Model" />
            <datalist id="ai-models"><option v-for="m in models" :key="m" :value="m" /></datalist>
            <button type="button" :disabled="aiBusy" class="shrink-0 rounded-md border border-stone-300 px-3 hover:bg-stone-50 disabled:opacity-40" @click="loadModels">Load models</button>
            <button :disabled="aiBusy || !model" class="shrink-0 rounded-md bg-stone-900 px-3 text-white disabled:opacity-40">{{ aiBusy ? 'Checking…' : 'Save' }}</button>
          </div>
          <p v-if="models.length" class="text-xs text-stone-500">{{ models.length }} models available. Pick one above.</p>
        </form>
        <p v-if="aiError" role="alert" class="text-xs text-red-700">{{ aiError }}</p>
      </section>

      <section class="space-y-2">
        <h3 class="font-medium">API tokens</h3>
        <p class="text-xs text-stone-500"><em>ingest</em> lets scripts and <code>opennotes push</code> drop notes in your AI inbox. <em>mcp</em> lets agents read pages you expose.</p>
        <ul class="divide-y divide-stone-100">
          <li v-for="t in tokens" :key="t.id" class="flex items-center justify-between py-1.5">
            <span>{{ t.name }} <span class="text-xs text-stone-400">· {{ t.scopes.join(', ') }} · last used {{ date(t.last_used_at) }}</span></span>
            <button class="text-xs text-red-700 hover:underline" @click="revoke(t)">Revoke</button>
          </li>
        </ul>
        <form class="space-y-2" @submit.prevent="createToken">
          <input v-model="tokenName" placeholder="Token name, e.g. laptop CLI" :class="input" aria-label="Token name" />
          <div class="flex items-center gap-4">
            <label v-for="s in ['ingest', 'mcp']" :key="s" class="flex items-center gap-1.5"><input v-model="tokenScopes" type="checkbox" :value="s" />{{ s }}</label>
            <button :disabled="!tokenName || !tokenScopes.length" class="ml-auto rounded-md border border-stone-300 px-3 py-1 hover:bg-stone-50 disabled:opacity-40">Create token</button>
          </div>
        </form>
        <p v-if="tokenError" role="alert" class="text-xs text-red-700">{{ tokenError }}</p>
        <div v-if="newToken" class="space-y-1 rounded-md bg-emerald-50 p-2.5 text-xs">
          <div class="text-emerald-800">Copy it now; it won't be shown again.</div>
          <code class="block break-all select-all text-stone-800">{{ newToken }}</code>
          <div class="text-stone-500">CLI: <code>OPENNOTES_URL={{ origin }} OPENNOTES_TOKEN=… opennotes push &lt; error.log</code></div>
        </div>
      </section>
    </div>
  </dialog>
</template>
