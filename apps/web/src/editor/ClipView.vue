<script setup lang="ts">
import { Play } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'
import { clipHref } from './Blocks'

// Editing the link and time lives in BlockToolbar.
const props = defineProps(nodeViewProps)
const href = computed(() => clipHref(props.node.attrs.url, props.node.attrs.start))
const range = computed(() => [props.node.attrs.start, props.node.attrs.end].filter(Boolean).join(' – '))
</script>

<template>
  <NodeViewWrapper class="my-4 rounded-md border px-4 py-3" data-type="clip">
    <div contenteditable="false" class="mb-1 flex items-center gap-2 text-xs">
      <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-primary-foreground no-underline hover:bg-primary/90"><Play class="size-3 fill-current" />{{ range }}</a>
      <span v-else class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono"><Play class="size-3 fill-current" />{{ range }}</span>
      <span class="truncate text-muted-foreground">{{ node.attrs.url }}</span>
    </div>
    <NodeViewContent as="blockquote" class="m-0 border-l-2 pl-3 text-muted-foreground italic" />
  </NodeViewWrapper>
</template>
