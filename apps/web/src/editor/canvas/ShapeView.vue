<script setup lang="ts">
import katex from 'katex'
import { computed, nextTick, onMounted, onUpdated, ref, watch } from 'vue'
import { center, linePoints, localBox, type Shapes } from './geometry'
import { arrowHead, strokePath } from './stroke'
import type { Shape } from './types'

// Inline styles only: exported SVGs carry no stylesheet but these.
const props = defineProps<{ shape: Shape; shapes?: Shapes; editing?: boolean; erasing?: boolean; lite?: boolean }>()
const emit = defineEmits<{ commit: [text: string]; autosize: [size: { w: number; h: number }] }>()

const s = computed(() => props.shape)
const color = computed(() => s.value.color ?? '#171717')
const box = computed(() => localBox(s.value, props.shapes ?? new Map()))
const transform = computed(() => {
  const c = center(box.value)
  return s.value.rotation ? `rotate(${(s.value.rotation * 180) / Math.PI} ${c.x} ${c.y})` : undefined
})
const path = computed(() => (s.value.type === 'draw' ? strokePath(s.value) : ''))
const line = computed(() => (s.value.type === 'line' || s.value.type === 'arrow' ? linePoints(s.value, props.shapes ?? new Map()) : null))
// KaTeX escapes input and, with trust off (default), emits no links or scripts.
const mathHtml = computed(() => (s.value.type === 'math' ? katex.renderToString(s.value.latex ?? '', { throwOnError: false, displayMode: true }) : ''))
const fill = computed(() => (s.value.fill ? color.value + '26' : 'none'))

// Text and notes size themselves to their content; the measured box is written back for hit-testing and export.
const content = ref<HTMLElement>()
function measure() {
  const el = content.value
  if (!el || props.lite) return
  const w = s.value.type === 'note' ? (s.value.w ?? 200) : Math.ceil(el.offsetWidth), h = Math.ceil(el.offsetHeight)
  if (Math.abs(w - (s.value.w ?? 0)) > 1 || Math.abs(h - (s.value.h ?? 0)) > 1) emit('autosize', { w, h })
}
onMounted(measure)
onUpdated(measure)

const editor = ref<HTMLElement>()
watch(() => props.editing, async (on) => {
  if (!on) return
  await nextTick()
  const el = editor.value
  if (!el) return
  el.textContent = s.value.text ?? ''
  el.focus()
  getSelection()?.selectAllChildren(el)
}, { immediate: true })
const commit = () => emit('commit', editor.value?.textContent ?? '')
</script>

<template>
  <g :data-shape-id="s.id" :data-shape-type="s.type" :transform="transform" :opacity="erasing ? 0.3 : 1">
    <path v-if="s.type === 'draw'" :d="path" :transform="`translate(${s.x} ${s.y})`" :fill="color" />

    <rect v-else-if="s.type === 'rect'" :x="s.x" :y="s.y" :width="s.w" :height="s.h" rx="4" :stroke="color" :stroke-width="s.size ?? 2" :fill="fill" stroke-linejoin="round" />

    <ellipse v-else-if="s.type === 'ellipse'" :cx="box.x + box.w / 2" :cy="box.y + box.h / 2" :rx="box.w / 2" :ry="box.h / 2" :stroke="color" :stroke-width="s.size ?? 2" :fill="fill" />

    <g v-else-if="line" :stroke="color" :stroke-width="s.size ?? 2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line :x1="line[0].x" :y1="line[0].y" :x2="line[1].x" :y2="line[1].y" />
      <path v-if="s.type === 'arrow'" :d="arrowHead(line[0], line[1], s.size ?? 2)" />
    </g>

    <image v-else-if="s.type === 'image'" :href="s.src" :x="s.x" :y="s.y" :width="s.w" :height="s.h" preserveAspectRatio="none" />

    <g v-else-if="s.type === 'frame'">
      <rect :x="s.x" :y="s.y" :width="s.w" :height="s.h" fill="#ffffff" fill-opacity="0.6" stroke="#a8a29e" stroke-width="1" />
      <text :x="s.x" :y="s.y - 6" font-size="12" fill="#78716c" font-family="Inter Variable, system-ui, sans-serif">{{ s.name || 'Frame' }}</text>
    </g>

    <rect v-else-if="lite" :x="s.x" :y="s.y" :width="s.w" :height="s.h" :fill="s.type === 'note' ? '#fde68a' : '#d6d3d1'" />

    <foreignObject v-else-if="s.type === 'math'" :x="s.x" :y="s.y" :width="s.w" :height="s.h">
      <div xmlns="http://www.w3.org/1999/xhtml" :style="{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: `${(22 * (s.h ?? 90)) / 90}px` }" v-html="mathHtml" />
    </foreignObject>

    <!-- text and note: foreignObject is oversized so content can lay out, then measured -->
    <foreignObject v-else :x="s.x" :y="s.y" :width="s.type === 'note' ? (s.w ?? 200) : Math.max(s.w ?? 0, 4000)" :height="Math.max(s.h ?? 0, 4000)" style="overflow: visible; pointer-events: none">
      <div
        xmlns="http://www.w3.org/1999/xhtml" ref="content"
        :style="{
          display: s.type === 'note' ? 'block' : 'inline-block', width: s.type === 'note' ? `${s.w ?? 200}px` : 'auto', boxSizing: 'border-box',
          padding: s.type === 'note' ? '12px' : '2px', background: s.type === 'note' ? '#fef08a' : 'transparent',
          boxShadow: s.type === 'note' ? '0 1px 3px rgba(0,0,0,.15)' : 'none', borderRadius: s.type === 'note' ? '4px' : '0',
          color: s.type === 'note' ? '#171717' : color, fontFamily: 'Inter Variable, system-ui, sans-serif',
          fontSize: `${s.type === 'note' ? 14 : (s.fontSize ?? 20)}px`, lineHeight: 1.35,
          whiteSpace: s.type === 'note' ? 'pre-wrap' : 'pre', overflowWrap: 'anywhere', minWidth: '1ch', minHeight: '1lh',
        }"
      >
        <div
          v-if="editing" ref="editor" contenteditable="plaintext-only" style="outline: none; pointer-events: auto; cursor: text"
          @input="measure" @blur="commit" @keydown.escape.stop.prevent="($event.target as HTMLElement).blur()"
          @pointerdown.stop
        />
        <template v-else>{{ s.text }}</template>
      </div>
    </foreignObject>
  </g>
</template>
