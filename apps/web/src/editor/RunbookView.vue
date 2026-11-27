<script setup lang="ts">
import { Check, ChevronDown, Copy, Database, Globe, SquareTerminal } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const props = defineProps(nodeViewProps)
const kinds = { cmd: { label: 'Shell', icon: SquareTerminal }, sql: { label: 'SQL', icon: Database }, http: { label: 'HTTP', icon: Globe } } as const
const statuses = {
  untested: { label: 'Untested', dot: 'bg-stone-400', text: 'text-muted-foreground' },
  works: { label: 'Works', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  broken: { label: 'Broken', dot: 'bg-red-500', text: 'text-red-700' },
} as const
const kind = computed(() => kinds[props.node.attrs.lang as keyof typeof kinds] ?? kinds.cmd)
const status = computed(() => statuses[props.node.attrs.status as keyof typeof statuses] ?? statuses.untested)
const editable = computed(() => props.editor.isEditable)

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(props.node.textContent)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <NodeViewWrapper class="not-prose my-4 overflow-hidden rounded-lg border bg-stone-50/60" data-type="runbook">
    <div contenteditable="false" class="flex h-9 items-center gap-1 border-b px-1.5 text-xs select-none">
      <DropdownMenu :modal="false">
        <DropdownMenuTrigger as-child :disabled="!editable">
          <Button variant="ghost" size="xs" class="gap-1.5 font-medium text-muted-foreground" aria-label="Snippet kind">
            <component :is="kind.icon" class="size-3.5" />{{ kind.label }}<ChevronDown v-if="editable" class="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem v-for="(k, key) in kinds" :key="key" @select="updateAttributes({ lang: key })"><component :is="k.icon" />{{ k.label }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="ml-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" class="size-7 text-muted-foreground" :aria-label="copied ? 'Copied' : 'Copy snippet'" :title="copied ? 'Copied' : 'Copy'" @click="copy">
          <component :is="copied ? Check : Copy" class="size-3.5" />
        </Button>
        <DropdownMenu :modal="false">
          <DropdownMenuTrigger as-child :disabled="!editable">
            <Button variant="ghost" size="xs" class="gap-1.5" :class="status.text" :aria-label="`Status: ${status.label}`" data-runbook-status>
              <span class="size-2 rounded-full" :class="status.dot" />{{ status.label }}<ChevronDown v-if="editable" class="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-for="(st, key) in statuses" :key="key" @select="updateAttributes({ status: key })">
              <span class="size-2 rounded-full" :class="st.dot" />{{ st.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <!-- overrides the note's own <pre> box, which would nest a second border in here -->
    <pre class="m-0! rounded-none! border-0! bg-transparent! px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-stone-800"><NodeViewContent as="code" /></pre>
  </NodeViewWrapper>
</template>
