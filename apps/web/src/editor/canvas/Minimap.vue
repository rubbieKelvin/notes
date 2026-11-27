<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { union, type Shapes } from './geometry'
import ShapeView from './ShapeView.vue'
import type { Box, Pt, Shape } from './types'

const props = defineProps<{ sorted: Shape[]; shapes: Shapes; content: Box | null; viewport: Box }>()
const emit = defineEmits<{ center: [Pt] }>()

const W = 200, H = 140
const live = computed(() => {
  const b = union([props.viewport, ...(props.content ? [props.content] : [])])!
  const pad = Math.max(b.w, b.h) * 0.05
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
})
const el = ref<SVGSVGElement>()
// Frozen while dragging, or the map would rescale under the pointer.
const frozen = shallowRef<Box | null>(null)
const world = computed(() => frozen.value ?? live.value)

/** Client point → page point, honouring the default xMidYMid meet letterboxing. */
function toPage(e: PointerEvent, w: Box): Pt {
  const r = el.value!.getBoundingClientRect()
  const k = Math.max(w.w / r.width, w.h / r.height)
  return { x: w.x + w.w / 2 + (e.clientX - r.left - r.width / 2) * k, y: w.y + w.h / 2 + (e.clientY - r.top - r.height / 2) * k }
}
function down(e: PointerEvent) {
  el.value!.setPointerCapture(e.pointerId)
  frozen.value = live.value
  emit('center', toPage(e, frozen.value))
}
function move(e: PointerEvent) {
  if (frozen.value) emit('center', toPage(e, frozen.value))
}
</script>

<template>
  <svg
    ref="el" :width="W" :height="H" :viewBox="`${world.x} ${world.y} ${world.w} ${world.h}`" data-minimap
    class="cursor-pointer rounded-md border bg-background/95 shadow-sm" role="img" aria-label="Minimap: click or drag to move around"
    @pointerdown.stop="down" @pointermove.stop="move" @pointerup.stop="frozen = null"
  >
    <ShapeView v-for="s in sorted" :key="s.id" :shape="s" :shapes="s.type === 'arrow' ? shapes : undefined" lite />
    <rect :x="viewport.x" :y="viewport.y" :width="viewport.w" :height="viewport.h" fill="rgb(37 99 235 / 0.08)" stroke="#2563eb" vector-effect="non-scaling-stroke" stroke-width="1.5" />
  </svg>
</template>
