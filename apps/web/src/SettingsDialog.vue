<script setup lang="ts">
import { ref } from 'vue'
import { api, errorText, type Me } from './api'

type Token = { id: string; name: string; scopes: string[]; last_used_at: string | null; created_at: string }
const props = defineProps<{ me: Me }>()
const dialog = ref<HTMLDialogElement>()

const keyHint = ref(props.me.anthropic_key_hint)
const keyInput = ref('')
const keyError = ref('')
const keyBusy = ref(false)

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

async function saveKey() {
  keyError.value = ''
  keyBusy.value = true
  try {
    keyHint.value = (await api<{ anthropic_key_hint: string }>('/v1/settings/anthropic-key', { method: 'PUT', body: { key: keyInput.value } })).anthropic_key_hint
    keyInput.value = ''
  } catch (e) {
    keyError.value = errorText(e)
  } finally {
    keyBusy.value = false
  }
}

async function removeKey() {
  await api('/v1/settings/anthropic-key', { method: 'DELETE' })
  keyHint.value = null
}

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
        <h3 class="font-medium">Anthropic API key</h3>
        <p class="text-xs text-stone-500">Margin notes run on your own key and your own Anthropic bill. It's stored encrypted and never sent back to the browser.</p>
        <div v-if="keyHint" class="flex items-center justify-between rounded-md bg-stone-50 px-2.5 py-1.5">
          <span>Saved key <code>••••{{ keyHint }}</code></span>
          <button class="text-xs text-red-700 hover:underline" @click="removeKey">Remove</button>
        </div>
        <form class="flex gap-2" @submit.prevent="saveKey">
          <input v-model="keyInput" type="password" autocomplete="off" :placeholder="keyHint ? 'Replace with a new key' : 'sk-ant-…'" :class="input" aria-label="Anthropic API key" />
          <button :disabled="keyBusy || !keyInput" class="shrink-0 rounded-md bg-stone-900 px-3 text-white disabled:opacity-40">{{ keyBusy ? 'Checking…' : 'Save' }}</button>
        </form>
        <p v-if="keyError" role="alert" class="text-xs text-red-700">{{ keyError }}</p>
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
