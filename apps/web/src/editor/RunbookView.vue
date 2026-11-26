<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const statuses = ['untested', 'works', 'broken'] as const
const badge: Record<string, string> = { untested: 'bg-stone-200 text-stone-600', works: 'bg-emerald-100 text-emerald-800', broken: 'bg-red-100 text-red-800' }
const cycle = () => props.updateAttributes({ status: statuses[(statuses.indexOf(props.node.attrs.status) + 1) % statuses.length] })
</script>

<template>
  <NodeViewWrapper class="not-prose my-4 overflow-hidden rounded-md border border-stone-200" data-type="runbook">
    <div contenteditable="false" class="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-2 py-1 text-xs">
      <select :value="node.attrs.lang" aria-label="Snippet kind" class="bg-transparent text-stone-600 outline-none" @change="updateAttributes({ lang: ($event.target as HTMLSelectElement).value })">
        <option value="cmd">shell</option>
        <option value="sql">SQL</option>
        <option value="http">HTTP</option>
      </select>
      <button class="ml-auto rounded px-1.5 py-0.5" :class="badge[node.attrs.status]" title="Click to change status" @click="cycle">{{ node.attrs.status }}</button>
    </div>
    <pre class="m-0 bg-white px-3 py-2 font-mono text-sm text-stone-800"><NodeViewContent as="code" /></pre>
  </NodeViewWrapper>
</template>
