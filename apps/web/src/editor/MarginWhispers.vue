<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { failed, fetchNote, listWhispers, pending, promoteWhisper, setWhisper, type Whisper } from './AiMargin'

const props = defineProps<{ editor: Editor; column: HTMLElement }>()
type Placed = Whisper & { top: number; lineY: number }
const placed = ref<Placed[]>([])
const open = reactive(new Set<string>())
const CARD_GAP = 8
const CARD_H = 72 // shortcut: assumed collapsed card height for stacking; measure if cards grow

function layout() {
  const box = props.column.getBoundingClientRect()
  let lastBottom = -Infinity
  placed.value = listWhispers(props.editor)
    .map((w) => ({ w, c: props.editor.view.coordsAtPos(w.from) }))
    .sort((a, b) => a.c.top - b.c.top)
    .map(({ w, c }) => {
      const lineY = (c.top + c.bottom) / 2 - box.top
      const top = Math.max(c.top - box.top - 4, lastBottom + CARD_GAP)
      lastBottom = top + CARD_H
      return { ...w, top, lineY }
    })
}

const ro = new ResizeObserver(layout)
onMounted(() => {
  props.editor.on('update', layout)
  ro.observe(props.editor.view.dom)
  layout()
})
onBeforeUnmount(() => { props.editor.off('update', layout); ro.disconnect() })

const toggle = (id: string) => (open.has(id) ? open.delete(id) : open.add(id))
</script>

<template>
  <!-- shortcut: margin only exists on wide screens (xl+); narrow layouts need an inline/sheet fallback -->
  <div class="pointer-events-none absolute inset-y-0 left-full hidden w-64 xl:block" aria-label="AI margin notes">
    <template v-for="w in placed" :key="w.id">
      <div class="absolute -left-6 w-6 border-t border-dashed border-ai-300" :style="{ top: `${w.lineY}px` }" />
      <aside
        class="pointer-events-auto absolute left-0 w-60 rounded-md border bg-background px-3 py-2 text-xs leading-snug text-muted-foreground"
        :style="{ top: `${w.top}px` }"
      >
        <div class="mb-1 flex items-center gap-1.5 text-[10px] text-stone-400">
          <span class="rounded-full bg-ai-50 px-1.5 py-px font-medium tracking-wide text-ai-700">AI</span>
          <span class="truncate">on “{{ w.text }}”</span>
        </div>
        <p v-if="pending.has(w.id)" class="flex items-center gap-1.5 text-stone-400"><span class="size-1.5 animate-pulse rounded-full bg-ai-500" />Thinking…</p>
        <p v-else-if="failed.has(w.id) || !w.note" class="text-amber-700">
          {{ failed.get(w.id) ?? 'No note yet.' }}
          <button class="ml-1 font-medium underline" @click="fetchNote(editor, w.id)">Retry</button>
        </p>
        <p v-else class="cursor-pointer text-stone-700" :class="open.has(w.id) ? '' : 'line-clamp-2'" :title="open.has(w.id) ? '' : 'Expand'" @click="toggle(w.id)">{{ w.note }}</p>
        <div class="mt-1.5 flex gap-3 text-[11px] font-medium text-stone-400">
          <button v-if="w.note" class="hover:text-stone-900" @click="promoteWhisper(editor, w.id)">Insert below</button>
          <button class="hover:text-stone-900" title="Dismiss (Esc inside the word)" @click="setWhisper(editor, w.id, null)">Dismiss</button>
        </div>
      </aside>
    </template>
  </div>
</template>
