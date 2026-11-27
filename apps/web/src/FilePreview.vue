<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { fileKind, parseCsv } from './files'

/** Shows a file in the page: image, player, PDF viewer, a table for CSV/TSV, or the first part of a text file. Nothing for other types. */
const props = defineProps<{ url: string; name: string; mime: string; size: number; large?: boolean }>()
const kind = computed(() => fileKind(props.mime, props.name))
const text = ref<string>()
const TEXT_MAX = 200 * 1024
const ROWS_MAX = 500
const truncated = computed(() => props.size > TEXT_MAX)
const delim = computed(() => (/\.csv$/i.test(props.name) ? ',' : /\.tsv$/i.test(props.name) ? '\t' : null))
const rows = computed(() => {
  if (!delim.value || text.value === undefined) return null
  const all = parseCsv(text.value, delim.value)
  if (truncated.value) all.pop() // the 200 KB cut can land mid-row
  return all
})

watchEffect(async () => {
  if (kind.value !== 'text') return
  // Only the first 200 KB: enough to read, never a whole big log in the DOM.
  const res = await fetch(props.url, { headers: { range: `bytes=0-${TEXT_MAX - 1}` } }).catch(() => null)
  text.value = res?.ok ? await res.text() : undefined
})
</script>

<template>
  <img v-if="kind === 'image'" :src="url" :alt="name" class="mx-auto block max-w-full object-contain" :class="large ? 'max-h-[80vh]' : 'max-h-[28rem]'" />
  <video v-else-if="kind === 'video'" :src="url" controls preload="metadata" class="mx-auto block max-w-full bg-black" :class="large ? 'max-h-[80vh]' : 'max-h-[28rem]'" />
  <audio v-else-if="kind === 'audio'" :src="url" controls preload="metadata" class="block w-full" />
  <iframe v-else-if="kind === 'pdf'" :src="url" :title="name" class="block w-full border-0 bg-muted" :class="large ? 'h-[80vh]' : 'h-[28rem]'" />
  <div v-else-if="rows?.length" class="overflow-auto bg-background" :class="large ? 'max-h-[80vh]' : 'max-h-80'">
    <table class="w-full border-collapse text-xs tabular-nums">
      <thead class="sticky top-0 bg-muted">
        <tr><th v-for="(h, i) in rows[0]" :key="i" class="border-b px-3 py-1.5 text-left font-medium whitespace-nowrap">{{ h }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows.slice(1, ROWS_MAX + 1)" :key="i" class="even:bg-muted/40">
          <td v-for="(c, j) in r" :key="j" class="max-w-80 truncate border-b border-border/60 px-3 py-1.5" :title="c">{{ c }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="truncated || rows.length > ROWS_MAX + 1" class="px-3 py-2 text-xs text-muted-foreground">Showing the first {{ Math.min(rows.length - 1, ROWS_MAX) }} rows.</p>
  </div>
  <pre v-else-if="kind === 'text' && text !== undefined" class="m-0 overflow-auto rounded-none bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap" :class="large ? 'max-h-[80vh]' : 'max-h-80'">{{ text }}{{ truncated ? '\n…' : '' }}</pre>
</template>
