<script setup lang="ts">
import { ref } from 'vue'
import { api, errorText, type DocInfo, type Me } from './api'
import SettingsDialog from './SettingsDialog.vue'
import { usePopover } from './usePopover'

const props = defineProps<{ me: Me; doc: DocInfo; docs: DocInfo[] }>()
const { open } = usePopover()
const settings = ref<InstanceType<typeof SettingsDialog>>()

// shortcut: switching pages reloads the app; fine while boot is fast, revisit if it isn't.
const go = (id: string) => location.assign(`/d/${id}`)

async function newPage() {
  const { id } = await api<{ id: string }>('/v1/docs', { body: {} })
  go(id)
}

async function deletePage() {
  if (!confirm(`Delete “${props.doc.title || 'Untitled'}”? This can't be undone.`)) return
  try {
    await api(`/v1/docs/${props.doc.id}`, { method: 'DELETE' })
    location.assign('/')
  } catch (e) {
    alert(errorText(e))
  }
}

async function signOut() {
  await api('/v1/auth/logout', { method: 'POST' })
  location.assign('/')
}
</script>

<template>
  <div ref="root" class="relative">
    <button class="rounded-full px-2 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Menu" :aria-expanded="open" @click="open = !open">≡</button>
    <nav v-if="open" class="absolute left-0 mt-2 w-72 rounded-lg border border-stone-200 bg-white p-1 text-sm text-stone-700 shadow-lg">
      <button class="w-full rounded px-2 py-1.5 text-left hover:bg-stone-100" @click="newPage">+ New page</button>
      <div class="my-1 max-h-72 overflow-y-auto border-y border-stone-100 py-1">
        <button
          v-for="d in docs" :key="d.id" class="flex w-full justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-stone-100"
          :class="d.id === doc.id && 'bg-stone-50 font-medium'" @click="go(d.id)"
        >
          <span class="truncate">{{ d.id === doc.id ? 'This page' : d.title || 'Untitled' }}</span>
          <span v-if="d.mcp_exposed_slug" class="text-[10px] text-emerald-600">MCP</span>
        </button>
      </div>
      <button class="w-full rounded px-2 py-1.5 text-left hover:bg-stone-100" @click="open = false; settings?.show()">Settings</button>
      <button class="w-full rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50" @click="deletePage">Delete this page</button>
      <div class="mt-1 flex items-center justify-between border-t border-stone-100 px-2 pt-2 pb-1 text-xs text-stone-400">
        <span class="truncate">{{ me.email }}</span>
        <button class="hover:text-stone-900" @click="signOut">Sign out</button>
      </div>
    </nav>
    <SettingsDialog ref="settings" :me="me" />
  </div>
</template>
