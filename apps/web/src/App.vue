<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError, errorText, type DocInfo, type Me } from './api'
import AuthView from './AuthView.vue'
import DocPage from './DocPage.vue'

const state = ref<'loading' | 'signed-out' | 'ready' | 'error'>('loading')
const me = ref<Me>()
const docs = ref<DocInfo[]>([])
const doc = ref<DocInfo>()
const error = ref('')

async function boot() {
  try {
    me.value = await api<Me>('/v1/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return void (state.value = 'signed-out')
    error.value = errorText(e)
    return void (state.value = 'error')
  }
  docs.value = await api<DocInfo[]>('/v1/docs')
  const wanted = location.pathname.match(/^\/d\/([0-9a-f-]{36})$/)?.[1]
  doc.value = docs.value.find((d) => d.id === wanted) ?? docs.value[0]
  if (!doc.value) {
    const { id } = await api<{ id: string }>('/v1/docs', { body: {} })
    doc.value = { id, title: 'Untitled', mcp_exposed_slug: null, updated_at: new Date().toISOString() }
    docs.value = [doc.value]
  }
  if (wanted !== doc.value.id) history.replaceState(null, '', `/d/${doc.value.id}`)
  state.value = 'ready'
}

window.addEventListener('opennotes:signed-out', () => (state.value = 'signed-out'))
onMounted(boot)
</script>

<template>
  <AuthView v-if="state === 'signed-out'" />
  <DocPage v-else-if="state === 'ready' && me && doc" :key="doc.id" :me="me" :doc="doc" :docs="docs" />
  <p v-else-if="state === 'error'" role="alert" class="p-8 text-sm text-red-700">Couldn't reach the server: {{ error }}</p>
</template>
