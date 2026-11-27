<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError, errorText, type DocInfo, type Me } from './api'
import AuthView from './AuthView.vue'
import DocPage from './DocPage.vue'
import NotesPage from './NotesPage.vue'
import FeedbackHost from './ui/FeedbackHost.vue'

const state = ref<'loading' | 'signed-out' | 'ready' | 'notes' | 'error'>('loading')
const me = ref<Me>()
const docs = ref<DocInfo[]>([])
const doc = ref<DocInfo>()
const error = ref('')
const linkError = ref('')

/** An emailed sign-in link lands as /#signin=<token>: trade it for a session cookie. */
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
  await consumeSignInLink()
  try {
    me.value = await api<Me>('/v1/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return void (state.value = 'signed-out')
    error.value = errorText(e)
    return void (state.value = 'error')
  }
  docs.value = await api<DocInfo[]>('/v1/docs')
  if (location.pathname === '/notes') return void (state.value = 'notes')
  const wanted = location.pathname.match(/^\/d\/([0-9a-f-]{36})$/)?.[1]
  doc.value = docs.value.find((d) => d.id === wanted) ?? docs.value[0]
  if (!doc.value) {
    const { id } = await api<{ id: string }>('/v1/docs', { body: {} })
    doc.value = { id, title: 'Untitled', description: '', mcp_exposed_slug: null, updated_at: new Date().toISOString() }
    docs.value = [doc.value]
  }
  if (wanted !== doc.value.id) history.replaceState(null, '', `/d/${doc.value.id}`)
  state.value = 'ready'
}

window.addEventListener('opennotes:signed-out', () => (state.value = 'signed-out'))
// Pasting the link into a tab already on the sign-in screen only changes the hash, so nothing reloads.
window.addEventListener('hashchange', () => location.hash.includes('signin=') && boot())
onMounted(boot)
</script>

<template>
  <AuthView v-if="state === 'signed-out'" :link-error="linkError" />
  <NotesPage v-else-if="state === 'notes' && me" :me="me" :docs="docs" />
  <DocPage v-else-if="state === 'ready' && me && doc" :key="doc.id" :me="me" :doc="doc" :docs="docs" />
  <p v-else-if="state === 'error'" role="alert" class="p-8 text-sm text-red-700">Couldn't reach the server: {{ error }}</p>
  <FeedbackHost />
</template>
