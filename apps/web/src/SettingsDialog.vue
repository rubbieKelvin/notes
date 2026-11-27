<script setup lang="ts">
import { KeyRound, LogOut, Sparkles, TriangleAlert, UserRound } from '@lucide/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { api, displayName, errorText, type AiSettings, type Me } from './api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { confirmDialog, promptDialog, toast } from './ui/feedback'
import ModelPicker from './ModelPicker.vue'

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

watch([keyInput, baseUrl], () => (models.value = []))
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

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'ai', label: 'AI provider', icon: Sparkles },
  { id: 'tokens', label: 'API tokens', icon: KeyRound },
  { id: 'account', label: 'Account', icon: TriangleAlert },
] as const
type Tab = (typeof TABS)[number]['id']
const tab = ref<Tab>('profile')

async function show(start?: string) {
  tab.value = TABS.some((t) => t.id === start) ? (start as Tab) : 'profile'
  name.value = props.me.name
  username.value = props.me.username
  open.value = true
  tokens.value = await api<Token[]>('/v1/tokens').catch(() => [])
}

// ── profile ──
const name = ref(props.me.name)
const username = ref(props.me.username)
const nameBusy = ref(false)
const profileChanged = computed(() => name.value.trim() !== props.me.name || username.value.trim().toLowerCase() !== props.me.username)
async function saveProfile() {
  nameBusy.value = true
  try {
    const r = await api<{ name: string; username: string }>('/v1/me', { method: 'PUT', body: { name: name.value, username: username.value } })
    // App owns `me`; updating it in place refreshes the avatar, menu and share links
    props.me.name = r.name
    props.me.username = r.username
    name.value = r.name
    username.value = r.username
    toast('Profile saved')
  } catch (e) {
    toast(errorText(e), 'error')
  } finally {
    nameBusy.value = false
  }
}
const memberSince = computed(() => new Date(props.me.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))

// ── account ──
async function signOutOthers() {
  try {
    const { ended } = await api<{ ended: number }>('/v1/auth/logout-others', { method: 'POST' })
    props.me.sessions = 1
    toast(ended ? `Signed out of ${ended} other ${ended === 1 ? 'device' : 'devices'}` : 'No other devices were signed in')
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
async function signOut() {
  await api('/v1/auth/logout', { method: 'POST' })
  location.assign('/')
}
async function deleteAccount() {
  const email = props.me.email
  const typed = await promptDialog({
    title: 'Delete your account?', body: 'Every page, canvas, image and API token goes with it, for good. This cannot be undone.',
    label: `Type ${email} to confirm`, value: '', placeholder: email, confirmLabel: 'Delete account',
    validate: (v) => (v.trim().toLowerCase() === email.toLowerCase() ? null : 'That isn’t your email address'),
  })
  if (!typed) return
  try {
    await api('/v1/me', { method: 'DELETE', body: { confirm_email: typed } })
    location.assign('/')
  } catch (e) {
    toast(errorText(e), 'error')
  }
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
    <DialogContent class="h-[min(40rem,90vh)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <TabsRoot v-model="tab" orientation="vertical" class="grid h-full min-h-0 grid-cols-[13rem_1fr]">
        <aside class="flex flex-col gap-4 border-r bg-muted/40 p-3">
          <DialogHeader class="px-2 pt-2"><DialogTitle class="text-base font-medium">Settings</DialogTitle></DialogHeader>
          <TabsList class="grid gap-0.5" aria-label="Settings sections">
            <TabsTrigger
              v-for="t in TABS" :key="t.id" :value="t.id"
              class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
            ><component :is="t.icon" class="size-4" />{{ t.label }}</TabsTrigger>
          </TabsList>
        </aside>

        <div class="min-h-0 overflow-y-auto">
          <TabsContent value="profile" class="grid content-start gap-6 p-6 outline-none">
            <header>
              <h3 class="text-lg">Profile</h3>
              <p class="text-sm text-muted-foreground">How you appear on your avatar and to people drawing on a canvas with you.</p>
            </header>
            <div class="flex items-center gap-4">
              <span class="grid size-16 place-items-center rounded-full bg-primary/10 text-2xl uppercase text-primary">{{ (name.trim() || displayName(me))[0] }}</span>
              <div class="grid">
                <span class="text-base">{{ name.trim() || displayName(me) }}</span>
                <span class="text-sm text-muted-foreground">{{ me.email }}</span>
              </div>
            </div>
            <form class="grid max-w-sm gap-4" @submit.prevent="saveProfile">
              <div class="grid gap-1.5">
                <Label for="profile-name">Display name</Label>
                <Input id="profile-name" v-model="name" :placeholder="me.email.split('@')[0]" maxlength="80" autocomplete="name" />
                <p class="text-xs text-muted-foreground">Leave empty to use the start of your email.</p>
              </div>
              <div class="grid gap-1.5">
                <Label for="profile-username">Username</Label>
                <div class="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring/40">
                  <span class="pl-3 text-sm text-muted-foreground">@</span>
                  <input id="profile-username" v-model="username" maxlength="30" autocomplete="username" pattern="[a-zA-Z0-9_]{2,30}" class="h-9 flex-1 bg-transparent pr-3 pl-0.5 text-sm outline-none" />
                </div>
                <p class="text-xs text-muted-foreground">Your public profile is <span class="text-foreground">{{ origin }}/public/@{{ username.trim().toLowerCase() || me.username }}</span>. Changing it changes the links to your public notes.</p>
              </div>
              <Button type="submit" class="justify-self-start" :disabled="nameBusy || !profileChanged">Save profile</Button>
            </form>
            <dl class="grid max-w-sm grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt class="text-muted-foreground">Email</dt><dd>{{ me.email }}<span class="block text-xs text-muted-foreground">Sign-in links are sent here.</span></dd>
              <dt class="text-muted-foreground">Member since</dt><dd>{{ memberSince }}</dd>
            </dl>
          </TabsContent>

          <TabsContent value="ai" class="grid content-start gap-4 p-6 outline-none">
            <header>
              <h3 class="text-lg">AI provider</h3>
              <p class="text-sm text-muted-foreground">Margin notes and canvas annotations run on your own account with the provider you choose. Keys are stored encrypted and never sent back to the browser.</p>
            </header>

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
                <ModelPicker v-model="model" :models="models" :loading="aiBusy" @load="loadModels" />
                <Button type="submit" :disabled="aiBusy || !model">{{ aiBusy ? 'Checking…' : 'Save' }}</Button>
              </div>
            </form>
            <p v-if="aiError" role="alert" class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{{ aiError }}</p>
          </TabsContent>

          <TabsContent value="tokens" class="grid content-start gap-4 p-6 outline-none">
            <header>
              <h3 class="text-lg">API tokens</h3>
              <p class="text-sm text-muted-foreground"><em>ingest</em> lets scripts and <code>opennotes push</code> drop notes in your AI inbox. <em>mcp</em> lets agents read pages you expose.</p>
            </header>

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
          </TabsContent>

          <TabsContent value="account" class="grid content-start gap-6 p-6 outline-none">
            <header>
              <h3 class="text-lg">Account</h3>
              <p class="text-sm text-muted-foreground">Where you're signed in, and leaving for good.</p>
            </header>
            <section class="grid gap-3 rounded-lg border p-4">
              <div>
                <h4 class="text-sm font-medium">Sessions</h4>
                <p class="text-sm text-muted-foreground">Signed in on {{ me.sessions }} {{ me.sessions === 1 ? 'device' : 'devices' }}, including this one.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" :disabled="me.sessions <= 1" @click="signOutOthers">Sign out other devices</Button>
                <Button variant="outline" size="sm" @click="signOut"><LogOut />Sign out</Button>
              </div>
            </section>
            <section class="grid gap-3 rounded-lg border border-destructive/30 p-4">
              <div>
                <h4 class="text-sm font-medium text-destructive">Delete account</h4>
                <p class="text-sm text-muted-foreground">Removes your account with every page, canvas, image and API token. There's no undo.</p>
              </div>
              <Button variant="outline" size="sm" class="justify-self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" @click="deleteAccount">Delete account…</Button>
            </section>
          </TabsContent>
        </div>
      </TabsRoot>
    </DialogContent>
  </Dialog>
</template>
