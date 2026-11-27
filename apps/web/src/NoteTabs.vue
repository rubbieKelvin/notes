<script setup lang="ts">
import { Ellipsis, Pencil, Plus, Trash2 } from '@lucide/vue'
import type * as Y from 'yjs'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { addTab, removeTab, renameTab, type Tab } from './editor/tabs'
import { confirmDialog, promptDialog } from './ui/feedback'

/** Tabs are pages of one note. Shown once a note has two; editors get a quiet "Add tab" before that. */
const props = defineProps<{ ydoc: Y.Doc; tabs: Tab[]; readOnly: boolean }>()
const active = defineModel<string>({ required: true })
const label = (t: Tab, i: number) => t.title.trim() || (i === 0 ? 'Main' : 'Untitled')

function add() {
  active.value = addTab(props.ydoc, `Tab ${props.tabs.length + 1}`)
}
async function rename(t: Tab, i: number) {
  if (props.readOnly) return
  const title = await promptDialog({ title: 'Rename tab', label: 'Name', value: label(t, i), confirmLabel: 'Rename' })
  if (title !== null) renameTab(props.ydoc, t.id, title.trim().slice(0, 80))
}
async function remove(t: Tab, i: number) {
  if (!(await confirmDialog({ title: `Delete the “${label(t, i)}” tab?`, body: "Everything on it is deleted for everyone. This can't be undone.", confirmLabel: 'Delete tab', danger: true }))) return
  removeTab(props.ydoc, t.id)
}
</script>

<template>
  <nav v-if="tabs.length > 1" class="mb-6 flex items-center gap-1 overflow-x-auto border-b" aria-label="Note tabs">
    <div role="tablist" class="flex items-center gap-1">
      <div v-for="(t, i) in tabs" :key="t.id" class="group relative flex items-center">
        <button
          type="button" role="tab" :aria-selected="active === t.id" data-note-tab
          class="-mb-px max-w-48 truncate border-b-2 px-3 py-2 text-sm transition-colors"
          :class="active === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="active = t.id" @dblclick="rename(t, i)"
        >{{ label(t, i) }}</button>
        <DropdownMenu v-if="!readOnly && active === t.id" :modal="false">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="size-6 text-muted-foreground" :aria-label="`${label(t, i)} tab options`"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem @select="rename(t, i)"><Pencil />Rename</DropdownMenuItem>
            <DropdownMenuItem class="text-destructive" @select="remove(t, i)"><Trash2 />Delete tab</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <Button v-if="!readOnly" variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Add tab" title="Add tab" @click="add"><Plus /></Button>
  </nav>
  <div v-else-if="!readOnly" class="-mt-8 mb-2 flex justify-end">
    <Button variant="ghost" size="sm" class="text-muted-foreground opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100" @click="add"><Plus />Add tab</Button>
  </div>
</template>
