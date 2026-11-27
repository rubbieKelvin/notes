<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'

/** A checklist with its progress and a "hide done" switch. Nested checklists count toward their top list. */
const props = defineProps(nodeViewProps)

const counts = computed(() => {
  let done = 0, total = 0
  props.node.descendants((n) => {
    if (n.type.name === 'taskItem') { total++; if (n.attrs.checked) done++ }
  })
  return { done, total }
})
// Only the outermost list gets the header; a nested one would repeat it.
const topLevel = computed(() => {
  const pos = props.getPos()
  return typeof pos !== 'number' || props.editor.state.doc.resolve(pos).parent.type.name !== 'taskItem'
})
const showHeader = computed(() => topLevel.value && counts.value.total >= 2)
const hideDone = computed(() => !!props.node.attrs.hideDone)
</script>

<template>
  <NodeViewWrapper :data-hide-done="hideDone" class="task-list">
    <div v-if="showHeader" contenteditable="false" class="mt-3 -mb-1 flex items-center gap-2 text-xs text-muted-foreground select-none" data-task-progress>
      <div class="h-1 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${(counts.done / counts.total) * 100}%` }" />
      </div>
      <span class="tabular-nums">{{ counts.done }}/{{ counts.total }} done</span>
      <button
        v-if="counts.done && editor.isEditable" type="button"
        class="ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent hover:text-foreground"
        @click="updateAttributes({ hideDone: !hideDone })"
      >
        <component :is="hideDone ? Eye : EyeOff" class="size-3" />{{ hideDone ? `Show ${counts.done} done` : 'Hide done' }}
      </button>
      <span v-else-if="hideDone && counts.done">{{ counts.done }} done hidden</span>
    </div>
    <NodeViewContent as="ul" data-type="taskList" />
  </NodeViewWrapper>
</template>
