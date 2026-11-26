<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const props = defineProps(nodeViewProps)
const statuses = ['untested', 'works', 'broken'] as const
const badge: Record<string, string> = { untested: 'bg-muted text-muted-foreground', works: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', broken: 'bg-red-100 text-red-800 hover:bg-red-100' }
const cycle = () => props.updateAttributes({ status: statuses[(statuses.indexOf(props.node.attrs.status) + 1) % statuses.length] })
</script>

<template>
  <NodeViewWrapper class="not-prose my-4 overflow-hidden rounded-md border" data-type="runbook">
    <div contenteditable="false" class="flex items-center gap-2 border-b bg-muted/50 px-2 py-1 text-xs">
      <Select :model-value="node.attrs.lang" @update:model-value="updateAttributes({ lang: $event })">
        <SelectTrigger size="sm" class="h-6! border-0 bg-transparent px-1.5 text-xs" aria-label="Snippet kind"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="cmd">shell</SelectItem>
          <SelectItem value="sql">SQL</SelectItem>
          <SelectItem value="http">HTTP</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="xs" class="ml-auto rounded-full" :class="badge[node.attrs.status]" title="Click to change status" @click="cycle">{{ node.attrs.status }}</Button>
    </div>
    <pre class="m-0 bg-background px-3 py-2 font-mono text-sm"><NodeViewContent as="code" /></pre>
  </NodeViewWrapper>
</template>
