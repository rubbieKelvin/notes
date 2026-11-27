<script setup lang="ts">
import { Check, ChevronsUpDown, Loader2, RefreshCw, Search } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Searchable model list. Opening it asks the provider for its models (`load`) if none are loaded yet.
 * Any typed id can be used too: some providers and local servers don't list every model they serve.
 */
const props = defineProps<{ models: string[]; loading: boolean }>()
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ load: [] }>()

const open = ref(false)
const query = ref('')
const active = ref(0)
const list = ref<HTMLElement>()

watch(open, (o) => {
  if (!o) return
  query.value = ''
  active.value = Math.max(0, props.models.indexOf(model.value))
  if (!props.models.length && !props.loading) emit('load')
})

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? props.models.filter((m) => m.toLowerCase().includes(q)) : props.models
})
// Offered after the matches when the typed id isn't listed exactly.
const custom = computed(() => {
  const q = query.value.trim()
  return q && !props.models.includes(q) ? q : ''
})
const options = computed(() => (custom.value ? [...matches.value, custom.value] : matches.value))
watch(query, () => (active.value = 0))
watch(active, async (i) => {
  await nextTick()
  list.value?.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' })
})

function pick(m: string) {
  model.value = m
  open.value = false
}
function onKey(e: KeyboardEvent) {
  const n = options.value.length
  if (e.key === 'ArrowDown' && n) active.value = (active.value + 1) % n
  else if (e.key === 'ArrowUp' && n) active.value = (active.value - 1 + n) % n
  else if (e.key === 'Enter' && options.value[active.value]) pick(options.value[active.value])
  else return
  e.preventDefault()
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" role="combobox" aria-label="Model" :aria-expanded="open" class="min-w-0 flex-1 justify-between font-normal">
        <span class="truncate" :class="!model && 'text-muted-foreground'">{{ model || 'Choose a model' }}</span>
        <ChevronsUpDown class="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="z-[1001] w-(--reka-popover-trigger-width) min-w-72 p-0">
      <div class="flex items-center gap-2 border-b px-3">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <input
          v-model="query" autofocus placeholder="Search or type a model id…" aria-label="Search models" role="combobox" aria-controls="model-list"
          :aria-activedescendant="options[active] ? `model-opt-${active}` : undefined" aria-expanded="true"
          class="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" @keydown="onKey"
        />
        <Button type="button" variant="ghost" size="icon-xs" aria-label="Reload models" title="Reload models" :disabled="loading" @click="emit('load')">
          <Loader2 v-if="loading" class="animate-spin" /><RefreshCw v-else />
        </Button>
      </div>
      <ul id="model-list" ref="list" role="listbox" aria-label="Models" class="max-h-64 overflow-y-auto p-1">
        <li
          v-for="(m, i) in options" :id="`model-opt-${i}`" :key="m" role="option" :data-index="i" :aria-selected="i === active"
          class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm" :class="i === active && 'bg-accent'"
          @pointerenter="active = i" @click="pick(m)"
        >
          <Check class="size-4 shrink-0" :class="m === model ? 'opacity-100' : 'opacity-0'" />
          <span v-if="m === custom" class="truncate">Use “<span class="font-mono">{{ m }}</span>”</span>
          <span v-else class="truncate font-mono text-[13px]">{{ m }}</span>
        </li>
        <li v-if="loading && !models.length" class="px-2 py-6 text-center text-sm text-muted-foreground">Loading models…</li>
        <li v-else-if="!options.length" class="px-2 py-6 text-center text-sm text-muted-foreground">
          {{ models.length ? 'No models match.' : 'No models loaded. Check the key, or type a model id.' }}
        </li>
      </ul>
      <p v-if="models.length" class="border-t px-3 py-1.5 text-xs text-muted-foreground">{{ models.length }} models available</p>
    </PopoverContent>
  </Popover>
</template>
