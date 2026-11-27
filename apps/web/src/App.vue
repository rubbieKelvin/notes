<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError, errorText, type DocInfo, type Me } from './api'
import AuthView from './AuthView.vue'
import DocPage from './DocPage.vue'
import NotesPage from './NotesPage.vue'
import PublicNote from './PublicNote.vue'
import PublicProfile from './PublicProfile.vue'
import { Button } from '@/components/ui/button'
import FeedbackHost from './ui/FeedbackHost.vue'

type State = 'loading' | 'signed-out' | 'ready' | 'notes' | 'no-access' | 'public-note' | 'public-profile' | 'error'
const state = ref<State>('loading')
const me = ref<Me>()
const docs = ref<DocInfo[]>([])
const doc = ref<DocInfo>()
const error = ref('')
const linkError = ref('')
// /public/@username[/<note id>] is readable without an account.
const publicRoute = location.pathname.match(/^\/public\/@([a-z0-9_]{2,30})(?:\/([0-9a-f-]{36}))?\/?$/)
const here = location.pathname
// /signin?next=<path>: a public reader signing in to react, then going back.
const signinNext = (() => {
  if (location.pathname !== '/signin') return ''
  const n = new URLSearchParams(location.search).get('next') ?? '/'
  return n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : '/'
})()
const wanted = location.pathname.match(/^\/d\/([0-9a-f-]{36})$/)?.[1]

/** An emailed sign-in link lands as <path>#signin=<token>: trade it for a session cookie. */
async function consumeSignInLink() {
  const token = new URLSearchParams(location.hash.slice(1)).get('signin')
  if (!token) return
  history.replaceState(null, '', location.pathname) // drop the token from the address bar and history
  try {
    await api('/v1/auth/verify', { body: { token } })
  } catch (e) {
    linkError.value = errorText(e)
  }
}

async function boot() {
  if (publicRoute) return void (state.value = publicRoute[2] ? 'public-note' : 'public-profile')
  await consumeSignInLink()
  try {
    me.value = await api<Me>('/v1/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return void (state.value = 'signed-out')
    error.value = errorText(e)
    return void (state.value = 'error')
  }
  if (signinNext) return void location.assign(signinNext)
  docs.value = await api<DocInfo[]>('/v1/docs')
  if (location.pathname === '/notes') return void (state.value = 'notes')
  if (wanted) {
    doc.value = docs.value.find((d) => d.id === wanted)
    // Not yours and not shared with you (or deleted): say so instead of quietly opening another note.
    return void (state.value = doc.value ? 'ready' : 'no-access')
  }
  doc.value = docs.value.find((d) => d.role === 'owner')
  if (!doc.value) {
    const { id } = await api<{ id: string }>('/v1/docs', { body: {} })
    doc.value = { id, title: 'Untitled', description: '', mcp_exposed_slug: null, is_public: false, updated_at: new Date().toISOString(), role: 'owner', owner_name: '', owner_username: null }
    docs.value = [doc.value, ...docs.value]
  }
  history.replaceState(null, '', `/d/${doc.value.id}`)
  state.value = 'ready'
}

async function signOut() {
  await api('/v1/auth/logout', { method: 'POST' })
  location.reload()
}

window.addEventListener('opennotes:signed-out', () => (state.value = 'signed-out'))
// Pasting the link into a tab already on the sign-in screen only changes the hash, so nothing reloads.
window.addEventListener('hashchange', () => location.hash.includes('signin=') && boot())
onMounted(boot)
</script>

<template>
  <PublicNote v-if="state === 'public-note' && publicRoute" :username="publicRoute[1]" :id="publicRoute[2]" />
  <PublicProfile v-else-if="state === 'public-profile' && publicRoute" :username="publicRoute[1]" />
  <AuthView v-else-if="state === 'signed-out'" :link-error="linkError" :next="signinNext || here" :invited="!!wanted" @signed-in="boot" />
  <NotesPage v-else-if="state === 'notes' && me" :me="me" :docs="docs" />
  <DocPage v-else-if="state === 'ready' && me && doc" :key="doc.id" :me="me" :doc="doc" :docs="docs" />
  <main v-else-if="state === 'no-access' && me" class="grid min-h-screen place-items-center px-6">
    <div class="max-w-sm text-center" role="alert">
      <h1 class="text-xl">You can't open this note</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        It doesn't exist, or it hasn't been shared with <span class="text-foreground">{{ me.email }}</span>. If someone invited a different address, sign in with that one.
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <Button as="a" href="/" variant="outline" size="sm">Go to my notes</Button>
        <Button variant="ghost" size="sm" @click="signOut">Use another email</Button>
      </div>
    </div>
  </main>
  <p v-else-if="state === 'error'" role="alert" class="p-8 text-sm text-red-700">Couldn't reach the server: {{ error }}</p>
  <FeedbackHost />
</template>
