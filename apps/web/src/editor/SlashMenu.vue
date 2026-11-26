<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SlashItem } from './SlashCommand'

const props = defineProps<{ items: SlashItem[]; command: (item: SlashItem) => void }>()
const active = ref(0)
watch(() => props.items, () => (active.value = 0))

function onKeyDown(e: KeyboardEvent) {
  const n = props.items.length
  if (!n) return false
  if (e.key === 'ArrowDown') active.value = (active.value + 1) % n
  else if (e.key === 'ArrowUp') active.value = (active.value + n - 1) % n
  else if (e.key === 'Enter') props.command(props.items[active.value])
  else return false
  return true
}
defineExpose({ onKeyDown })
</script>

<template>
  <div v-show="items.length" role="listbox" class="z-50 w-60 rounded-lg border border-stone-200 bg-white p-1 text-sm shadow-lg">
    <button
      v-for="(item, i) in items" :key="item.title" role="option" :aria-selected="i === active"
      class="flex w-full justify-between rounded px-2 py-1.5 text-left"
      :class="i === active ? 'bg-stone-100' : ''"
      @mouseenter="active = i" @mousedown.prevent="command(item)"
    >
      <span>/{{ item.title }}</span><span class="text-stone-400">{{ item.hint }}</span>
    </button>
  </div>
</template>
