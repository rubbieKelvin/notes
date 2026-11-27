<script setup lang="ts">
import { Code, Workflow } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps(nodeViewProps)
const editable = computed(() => props.editor.isEditable)
const source = computed(() => props.node.textContent)
// a new (empty) diagram opens on its source; others open on the picture
const showCode = ref(!source.value.trim())
const svg = ref('')
const error = ref('')

let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
watch(source, (text) => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!text.trim()) return void ([svg.value, error.value] = ['', ''])
    const { default: mermaid } = await import('mermaid') // large; only notes with diagrams pay for it
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
    const mine = ++seq
    try {
      const out = await mermaid.render(`mermaid-${crypto.randomUUID()}`, text)
      if (mine === seq) [svg.value, error.value] = [out.svg, '']
    } catch (e) {
      if (mine === seq) error.value = e instanceof Error ? e.message : String(e)
    }
  }, 300)
}, { immediate: true })
</script>

<template>
  <NodeViewWrapper class="not-prose my-4 overflow-hidden rounded-lg border" data-type="mermaid">
    <div contenteditable="false" class="flex h-9 items-center gap-1.5 border-b px-3 text-xs font-medium text-muted-foreground select-none">
      <Workflow class="size-3.5" />Diagram
      <Button v-if="editable" variant="ghost" size="xs" class="ml-auto gap-1.5" :aria-pressed="showCode" @click="showCode = !showCode">
        <Code class="size-3.5" />{{ showCode ? 'Hide code' : 'Edit code' }}
      </Button>
    </div>
    <pre v-show="editable && showCode" class="m-0! rounded-none! border-0! border-b! bg-stone-50/60! px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-stone-800"><NodeViewContent as="code" /></pre>
    <div contenteditable="false" class="px-4 py-3">
      <p v-if="error" class="font-mono text-xs whitespace-pre-wrap text-red-700">{{ error }}</p>
      <!-- mermaid's strict mode sanitizes the SVG it returns -->
      <div v-else-if="svg" class="flex justify-center [&_svg]:max-w-full" v-html="svg" />
      <p v-else class="text-xs text-muted-foreground">{{ editable ? 'Write mermaid code above, e.g. graph TD; A-->B' : 'Empty diagram' }}</p>
    </div>
  </NodeViewWrapper>
</template>
