<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { SlashItem } from './SlashCommand'

const props = defineProps<{ items: SlashItem[]; query: string; command: (item: SlashItem) => void }>()
const active = ref(0)
const list = ref<HTMLElement>()

// Group in first-seen order; when searching, the best match's group comes first.
const groups = computed(() => {
  const out = new Map<string, { item: SlashItem; index: number }[]>()
  props.items.forEach((item, index) => out.set(item.group, [...(out.get(item.group) ?? []), { item, index }]))
  return [...out]
})
// Keyboard order follows what's on screen, which can differ from props.items once grouped.
const order = computed(() => groups.value.flatMap(([, rows]) => rows.map((r) => r.index)))

watch(() => props.items, () => (active.value = 0))
watch(active, async () => {
  await nextTick()
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
})

function onKeyDown(e: KeyboardEvent) {
  const n = order.value.length
  if (!n) return false
  if (e.key === 'ArrowDown') active.value = (active.value + 1) % n
  else if (e.key === 'ArrowUp') active.value = (active.value + n - 1) % n
  else if (e.key === 'Enter' || e.key === 'Tab') props.command(props.items[order.value[active.value]])
  else return false
  return true
}
defineExpose({ onKeyDown })
</script>

<template>
  <div class="z-50 w-72 rounded-md border bg-popover text-sm text-popover-foreground select-none">
    <div ref="list" role="listbox" aria-label="Insert block" class="max-h-[min(400px,50vh)] overflow-y-auto p-1">
      <p v-if="!items.length" class="px-3 py-6 text-center text-sm text-muted-foreground">No results for “{{ query }}”</p>
      <section v-for="[name, rows] in groups" :key="name" class="pb-1">
        <h3 class="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{{ name }}</h3>
        <div
          v-for="{ item, index } in rows" :key="item.title" role="option" :aria-selected="order[active] === index"
          class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5"
          :class="order[active] === index ? 'bg-accent text-accent-foreground' : ''"
          @mousemove="active = order.indexOf(index)" @mousedown.prevent="command(item)"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
            <component :is="item.icon" class="size-4" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm">{{ item.title }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ item.description }}</span>
          </span>
        </div>
      </section>
    </div>
    <footer class="flex gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
      <span><kbd class="font-sans">↑↓</kbd> navigate</span><span><kbd class="font-sans">↵</kbd> insert</span><span><kbd class="font-sans">esc</kbd> close</span>
    </footer>
  </div>
</template>
