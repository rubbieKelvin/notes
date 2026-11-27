<script setup lang="ts">
import { ref } from 'vue'
import { api, errorText } from './api'
import { toast } from './ui/feedback'

type Reaction = { emoji: string; count: number; mine: boolean }
type Data = { emoji: string[]; can_react: boolean; reactions: Reaction[] }

/** Reactions on a public note: everyone sees them, signed-in readers can add their own. */
const props = defineProps<{ docId: string }>()
const data = ref<Data>()
api<Data>(`/v1/docs/${props.docId}/reactions`).then((d) => (data.value = d)).catch(() => {})

const countOf = (e: string) => data.value?.reactions.find((r) => r.emoji === e)
async function react(emoji: string) {
  if (!data.value?.can_react) return void location.assign(`/signin?next=${encodeURIComponent(location.pathname)}`)
  try {
    data.value = await api<Data>(`/v1/docs/${props.docId}/reactions`, { body: { emoji } })
  } catch (e) {
    toast(errorText(e), 'error')
  }
}
</script>

<template>
  <div v-if="data" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reactions">
    <button
      v-for="e in data.emoji" :key="e" type="button" :aria-pressed="!!countOf(e)?.mine"
      :aria-label="`${e} ${countOf(e)?.count ?? 0}`" :title="data.can_react ? 'React' : 'Sign in to react'"
      class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm tabular-nums transition-colors hover:bg-accent"
      :class="[countOf(e)?.mine && 'border-primary/40 bg-primary/10', !countOf(e) && 'text-muted-foreground']"
      @click="react(e)"
    ><span>{{ e }}</span><span v-if="countOf(e)">{{ countOf(e)!.count }}</span></button>
    <span v-if="!data.can_react" class="ml-1 text-xs text-muted-foreground">Sign in to react</span>
  </div>
</template>
