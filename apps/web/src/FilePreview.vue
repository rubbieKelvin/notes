<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { fileKind } from './files'

/** Shows a file in the page: image, player, PDF viewer, or the first part of a text file. Nothing for other types. */
const props = defineProps<{ url: string; name: string; mime: string; size: number; large?: boolean }>()
const kind = computed(() => fileKind(props.mime, props.name))
const text = ref<string>()
const TEXT_MAX = 200 * 1024

watchEffect(async () => {
  if (kind.value !== 'text') return
  // Only the first 200 KB: enough to read, never a whole big log in the DOM.
  const res = await fetch(props.url, { headers: { range: `bytes=0-${TEXT_MAX - 1}` } }).catch(() => null)
  text.value = res?.ok ? (await res.text()) + (props.size > TEXT_MAX ? '\n…' : '') : undefined
})
</script>

<template>
  <img v-if="kind === 'image'" :src="url" :alt="name" class="mx-auto block max-w-full object-contain" :class="large ? 'max-h-[80vh]' : 'max-h-[28rem]'" />
  <video v-else-if="kind === 'video'" :src="url" controls preload="metadata" class="mx-auto block max-w-full bg-black" :class="large ? 'max-h-[80vh]' : 'max-h-[28rem]'" />
  <audio v-else-if="kind === 'audio'" :src="url" controls preload="metadata" class="block w-full" />
  <iframe v-else-if="kind === 'pdf'" :src="url" :title="name" class="block w-full border-0 bg-muted" :class="large ? 'h-[80vh]' : 'h-[28rem]'" />
  <pre v-else-if="kind === 'text' && text !== undefined" class="m-0 overflow-auto rounded-none bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap" :class="large ? 'max-h-[80vh]' : 'max-h-80'">{{ text }}</pre>
</template>
