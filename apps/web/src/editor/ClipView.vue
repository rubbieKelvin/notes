<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'
import { clipHref, parseClip } from './Blocks'

const props = defineProps(nodeViewProps)
const href = computed(() => clipHref(props.node.attrs.url, props.node.attrs.start))
const range = computed(() => [props.node.attrs.start, props.node.attrs.end].filter(Boolean).join(' – '))

function edit() {
  const { url, start, end } = props.node.attrs
  const next = window.prompt('Link and time range, e.g. https://youtu.be/… 14:22-15:08', `${url} ${start}${end ? `-${end}` : ''}`)
  if (next === null) return
  const parsed = parseClip(next)
  if (parsed) props.updateAttributes(parsed)
  else window.alert('Use: an http(s) link, a space, then a time like 14:22 or 14:22-15:08')
}
</script>

<template>
  <NodeViewWrapper class="my-4 rounded-md border border-stone-200 px-3 py-2" data-type="clip">
    <div contenteditable="false" class="mb-1 flex items-center gap-2 text-xs">
      <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer" class="rounded bg-stone-900 px-1.5 py-0.5 font-mono text-white no-underline">▶ {{ range }}</a>
      <span v-else class="rounded bg-stone-200 px-1.5 py-0.5 font-mono">▶ {{ range }}</span>
      <span class="truncate text-stone-400">{{ node.attrs.url }}</span>
      <button class="ml-auto text-stone-400 hover:text-stone-900" @click="edit">edit</button>
    </div>
    <NodeViewContent as="blockquote" class="m-0 border-l-2 border-stone-300 pl-3 text-stone-600 italic" />
  </NodeViewWrapper>
</template>
