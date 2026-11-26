<script setup lang="ts">
import { computed, ref } from 'vue'
import { api, errorText, type DocInfo } from './api'
import { usePopover } from './usePopover'

const props = defineProps<{ doc: DocInfo }>()
const { open } = usePopover()
const slug = ref(props.doc.mcp_exposed_slug)
const error = ref('')
const endpoint = `${location.origin}/mcp`
const addCmd = computed(() => `claude mcp add --transport http opennotes ${endpoint} --header "Authorization: Bearer <token with mcp scope>"`)

async function toggle() {
  error.value = ''
  try {
    slug.value = (await api<{ mcp_exposed_slug: string | null }>(`/v1/docs/${props.doc.id}/mcp`, { method: 'PUT', body: { enabled: !slug.value } })).mcp_exposed_slug
  } catch (e) {
    error.value = errorText(e)
  }
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      class="rounded-full bg-white/80 px-3 py-1 backdrop-blur hover:text-stone-900" :class="slug ? 'text-emerald-700' : 'text-stone-400'"
      :aria-expanded="open" aria-haspopup="dialog" @click="open = !open"
    >MCP{{ slug ? ': Live' : '' }}</button>
    <div v-if="open" role="dialog" aria-label="MCP access" class="absolute right-0 mt-2 w-96 space-y-3 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-600 shadow-lg">
      <label class="flex items-center justify-between gap-3">
        <span>Let my agents read this page</span>
        <input type="checkbox" class="size-4 accent-emerald-600" :checked="!!slug" @change="toggle" />
      </label>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <template v-if="slug">
        <p class="text-xs text-stone-500">Agents connected to your MCP endpoint can list and read it as <code class="rounded bg-stone-100 px-1">{{ slug }}</code>, including margin notes and canvas text. They can't edit it.</p>
        <div class="text-xs">
          <div class="mb-1 text-stone-400">Connect Claude Code (create an <em>mcp</em> token in Settings):</div>
          <code class="block break-all rounded bg-stone-50 p-2 text-stone-700">{{ addCmd }}</code>
        </div>
      </template>
    </div>
  </div>
</template>
