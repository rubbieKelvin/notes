<script setup lang="ts">
import { BadgeCheck, Lightbulb, Pencil, Scale, Trash2, Ungroup } from '@lucide/vue'
import type { Node as PMNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { parseClip } from './Blocks'
import { clipPrompt } from './SlashCommand'

/** Per-block actions for our note elements, pinned to the block the cursor is in. */
const props = defineProps<{ editor: Editor; column: HTMLElement }>()
const BLOCKS: Record<string, string> = { callout: 'Callout', aiSource: 'AI source', clip: 'Clip', runbook: 'Runbook' }
const kinds = [
  { kind: 'hypothesis', label: 'Hypothesis', icon: Lightbulb },
  { kind: 'fact', label: 'Evidence', icon: BadgeCheck },
  { kind: 'contradicts', label: 'Contradicts', icon: Scale },
]

const block = shallowRef<{ node: PMNode; pos: number } | null>(null)
const top = ref(0)
const right = ref(0)

function update() {
  const { selection } = props.editor.state
  let found: { node: PMNode; pos: number } | null = null
  if (selection instanceof NodeSelection && BLOCKS[selection.node.type.name]) found = { node: selection.node, pos: selection.from }
  for (let d = selection.$from.depth; !found && d > 0; d--) {
    const node = selection.$from.node(d)
    if (BLOCKS[node.type.name]) found = { node, pos: selection.$from.before(d) }
  }
  const dom = found && (props.editor.view.nodeDOM(found.pos) as HTMLElement | null)
  if (!found || !dom || !props.editor.isFocused) return void (block.value = null)
  const box = props.column.getBoundingClientRect()
  const r = dom.getBoundingClientRect()
  // inside the block's top-right corner, so it never covers the block above
  top.value = r.top - box.top + 6
  right.value = box.right - r.right + 6
  block.value = found
}

// The toolbar's own buttons blur the editor for a moment; keep it open across that.
const onBlur = () => setTimeout(update)
onMounted(() => {
  props.editor.on('selectionUpdate', update).on('update', update).on('focus', update).on('blur', onBlur)
})
onBeforeUnmount(() => {
  props.editor.off('selectionUpdate', update).off('update', update).off('focus', update).off('blur', onBlur)
})

const run = (fn: () => void) => { fn(); props.editor.commands.focus() }
const setKind = (kind: string) => run(() => props.editor.view.dispatch(props.editor.state.tr.setNodeAttribute(block.value!.pos, 'kind', kind)))
const unwrap = () => {
  const { pos, node } = block.value!
  run(() => props.editor.view.dispatch(props.editor.state.tr.replaceWith(pos, pos + node.nodeSize, node.content)))
}
const remove = () => {
  const { pos, node } = block.value!
  run(() => props.editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run())
}
async function editClip() {
  const { pos, node } = block.value!
  const { url, start, end } = node.attrs
  const clip = parseClip((await clipPrompt(`${url} ${start}${end ? `-${end}` : ''}`)) ?? '')
  if (clip) props.editor.view.dispatch(props.editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...clip }))
  props.editor.commands.focus()
}
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div
      v-if="block" role="toolbar" :aria-label="`${BLOCKS[block.node.type.name]} actions`"
      class="absolute z-30 flex items-center gap-0.5 rounded-md border bg-background p-0.5"
      :style="{ top: `${top}px`, right: `${right}px` }"
      @mousedown.prevent
    >
      <template v-if="block.node.type.name === 'callout'">
        <Tooltip v-for="k in kinds" :key="k.kind">
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon-xs" :aria-label="k.label" :aria-pressed="block.node.attrs.kind === k.kind" :class="block.node.attrs.kind === k.kind && 'bg-accent'" @click="setKind(k.kind)"><component :is="k.icon" /></Button>
          </TooltipTrigger>
          <TooltipContent>{{ k.label }}</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" class="mx-0.5 h-4!" />
      </template>
      <Tooltip v-if="block.node.type.name === 'callout' || block.node.type.name === 'aiSource'">
        <TooltipTrigger as-child><Button variant="ghost" size="icon-xs" aria-label="Unwrap" @click="unwrap"><Ungroup /></Button></TooltipTrigger>
        <TooltipContent>Unwrap, keep the text</TooltipContent>
      </Tooltip>
      <Tooltip v-if="block.node.type.name === 'clip'">
        <TooltipTrigger as-child><Button variant="ghost" size="icon-xs" aria-label="Edit clip" @click="editClip"><Pencil /></Button></TooltipTrigger>
        <TooltipContent>Edit link and time</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child><Button variant="ghost" size="icon-xs" class="hover:bg-destructive/10 hover:text-destructive" :aria-label="`Delete ${BLOCKS[block.node.type.name].toLowerCase()}`" @click="remove"><Trash2 /></Button></TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
