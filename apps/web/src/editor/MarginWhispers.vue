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
      <div class="absolute -left-6 w-6 border-t border-stone-300" :style="{ top: `${w.lineY}px` }" />
      <aside
        class="pointer-events-auto absolute left-0 w-60 rounded-md border border-stone-200 bg-white/95 px-2.5 py-1.5 text-xs leading-snug text-stone-600 shadow-sm"
        :style="{ top: `${w.top}px` }"
      >
        <div class="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-400">
          <span class="rounded bg-stone-100 px-1 font-medium">AI</span>
          <span class="truncate normal-case">on “{{ w.text }}”</span>
        </div>
        <p v-if="pending.has(w.id)" class="animate-pulse text-stone-400">Thinking…</p>
        <p v-else-if="failed.has(w.id) || !w.note" class="text-amber-700">
          {{ failed.get(w.id) ?? 'No note yet.' }}
          <button class="ml-1 underline" @click="fetchNote(editor, w.id)">Retry</button>
        </p>
        <p v-else class="cursor-pointer" :class="open.has(w.id) ? '' : 'line-clamp-2'" :title="open.has(w.id) ? '' : 'Expand'" @click="toggle(w.id)">{{ w.note }}</p>
        <div class="mt-1 flex gap-2 text-[11px] text-stone-400">
          <button v-if="w.note" class="hover:text-stone-800" @click="promoteWhisper(editor, w.id)">Insert below</button>
          <button class="hover:text-stone-800" title="Dismiss (Esc inside the word)" @click="setWhisper(editor, w.id, null)">Dismiss</button>
        </div>
      </aside>
    </template>
  </div>
</template>
