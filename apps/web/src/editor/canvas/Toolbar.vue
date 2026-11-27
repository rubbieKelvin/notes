<script setup lang="ts">
import { ArrowUpRight, ChevronUp, Circle, Eraser, Frame, Hand, ImagePlus, Minus, MousePointer2, Pencil, Redo2, Square, Type, Undo2 } from '@lucide/vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { COLORS, SIZE_BANDS, SIZE_MAX, SIZE_MIN, sizeLabel, type Tool } from './types'

/** compact: the inline (collapsed) canvas, where shapes fold into one popover. */
const props = defineProps<{ tool: Tool; style: { color: string; size: number; fill: boolean }; compact?: boolean }>()
const emit = defineEmits<{ menu: [open: boolean]; tool: [Tool]; color: [string]; size: [number]; fill: [boolean]; image: []; undo: []; redo: [] }>()

const BASIC = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
  { id: 'hand', icon: Hand, label: 'Hand', key: 'H' },
  { id: 'draw', icon: Pencil, label: 'Pen', key: 'D' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'E' },
] as const
const SHAPES = [
  { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
  { id: 'line', icon: Minus, label: 'Line', key: 'L' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', key: 'A' },
  { id: 'frame', icon: Frame, label: 'Frame', key: 'F' },
] as const
const TEXT = { id: 'text', icon: Type, label: 'Text', key: 'T' } as const

// The shapes button shows the shape last picked, so one click reuses it.
const lastShape = ref<(typeof SHAPES)[number]>(SHAPES[0])
const activeShape = computed(() => SHAPES.find((s) => s.id === props.tool))
const shapeButton = computed(() => activeShape.value ?? lastShape.value)
const shapesOpen = ref(false)
function pickShape(s: (typeof SHAPES)[number]) {
  lastShape.value = s
  shapesOpen.value = false
  emit('tool', s.id)
}

const colorLabel = computed(() => COLORS.find((c) => c.value === props.style.color)?.label ?? 'Custom')
const colorOpen = ref(false)
const sizeOpen = ref(false)
// While a popover is open the toolbar must stay visible, even with the pointer over the popover outside the canvas.
watch(() => shapesOpen.value || colorOpen.value || sizeOpen.value, (open) => emit('menu', open))
const bandWidth = (b: (typeof SIZE_BANDS)[number]) => `${((b.to - b.from + 1) / (SIZE_MAX - SIZE_MIN + 1)) * 100}%`
const pop = 'z-[1001] w-auto p-3'
</script>

<template>
  <div class="flex items-center gap-0.5 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur" role="toolbar" aria-label="Canvas tools">
    <Button
      v-for="t in BASIC" :key="t.id" variant="ghost" size="icon-sm" :aria-label="t.label" :title="`${t.label} (${t.key})`"
      :aria-pressed="tool === t.id" :class="tool === t.id && 'bg-accent text-accent-foreground'" @click="emit('tool', t.id)"
    ><component :is="t.icon" /></Button>

    <Popover v-if="compact" v-model:open="shapesOpen">
      <PopoverTrigger as-child>
        <Button
          variant="ghost" size="sm" class="gap-0.5 px-1.5" aria-label="Shapes" :title="`Shapes: ${shapeButton.label}`"
          :aria-pressed="!!activeShape" :class="activeShape && 'bg-accent text-accent-foreground'"
        ><component :is="shapeButton.icon" /><ChevronUp class="size-3! opacity-60" /></Button>
      </PopoverTrigger>
      <PopoverContent side="top" :class="pop">
        <p class="mb-2 text-xs font-medium text-muted-foreground">Shapes</p>
        <div class="grid grid-cols-5 gap-1">
          <button
            v-for="s in SHAPES" :key="s.id" type="button" :aria-pressed="tool === s.id"
            class="flex w-16 flex-col items-center gap-1 rounded-md p-1.5 text-[11px] hover:bg-accent" :class="tool === s.id && 'bg-accent'"
            @click="pickShape(s)"
          ><component :is="s.icon" class="size-4" />{{ s.label }}<kbd class="text-[10px] text-muted-foreground">{{ s.key }}</kbd></button>
        </div>
      </PopoverContent>
    </Popover>
    <template v-else>
      <Button
        v-for="t in SHAPES" :key="t.id" variant="ghost" size="icon-sm" :aria-label="t.label" :title="`${t.label} (${t.key})`"
        :aria-pressed="tool === t.id" :class="tool === t.id && 'bg-accent text-accent-foreground'" @click="emit('tool', t.id)"
      ><component :is="t.icon" /></Button>
    </template>

    <Button
      variant="ghost" size="icon-sm" :aria-label="TEXT.label" :title="`${TEXT.label} (${TEXT.key})`"
      :aria-pressed="tool === TEXT.id" :class="tool === TEXT.id && 'bg-accent text-accent-foreground'" @click="emit('tool', TEXT.id)"
    ><Type /></Button>
    <Button variant="ghost" size="icon-sm" aria-label="Image" title="Image (I)" @click="emit('image')"><ImagePlus /></Button>
    <span class="mx-1 h-5 w-px bg-border" />

    <Popover v-model:open="colorOpen">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="icon-sm" :aria-label="`Color: ${colorLabel}`" :title="`Color: ${colorLabel}`">
          <span class="size-4 rounded-full border" :style="{ background: style.fill ? style.color + '40' : style.color, borderColor: style.color, borderWidth: style.fill ? '2px' : '1px' }" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" :class="pop">
        <p class="mb-2 text-xs font-medium text-muted-foreground">Color</p>
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="c in COLORS" :key="c.value" type="button" :aria-pressed="style.color === c.value"
            class="flex w-14 flex-col items-center gap-1 rounded-md p-1.5 text-[11px] hover:bg-accent" :class="style.color === c.value && 'bg-accent'"
            @click="emit('color', c.value); colorOpen = false"
          ><span class="size-5 rounded-full ring-offset-2 ring-offset-popover" :class="style.color === c.value && 'ring-2 ring-ring'" :style="{ background: c.value }" />{{ c.label }}</button>
        </div>
        <div class="mt-3 flex items-center justify-between border-t pt-3">
          <Label for="canvas-fill" class="text-xs">Fill shapes</Label>
          <Switch id="canvas-fill" :model-value="style.fill" @update:model-value="emit('fill', !!$event)" />
        </div>
      </PopoverContent>
    </Popover>

    <Popover v-model:open="sizeOpen">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="icon-sm" :aria-label="`Size: ${sizeLabel(style.size)} (${style.size})`" :title="`Size: ${sizeLabel(style.size)}`">
          <span class="rounded-full bg-foreground" :style="{ width: `${Math.min(16, style.size + 2)}px`, height: `${Math.min(16, style.size + 2)}px` }" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" :class="[pop, 'w-64']">
        <div class="mb-3 flex items-baseline justify-between">
          <p class="text-xs font-medium text-muted-foreground">Size</p>
          <p class="text-xs tabular-nums"><span class="font-medium">{{ sizeLabel(style.size) }}</span> · {{ style.size }}px</p>
        </div>
        <SliderRoot
          :model-value="[style.size]" :min="SIZE_MIN" :max="SIZE_MAX" :step="1" aria-label="Stroke size"
          class="relative flex h-5 w-full touch-none items-center select-none" @update:model-value="emit('size', $event![0])"
        >
          <SliderTrack class="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
            <SliderRange class="absolute h-full bg-primary" />
          </SliderTrack>
          <SliderThumb class="block size-4 rounded-full border-2 border-primary bg-background shadow focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" />
        </SliderRoot>
        <!-- marked bands under the track -->
        <div class="mt-2 flex">
          <button
            v-for="b in SIZE_BANDS" :key="b.label" type="button" :style="{ width: bandWidth(b) }"
            class="border-l px-1 text-left text-[11px] first:border-l-0 hover:text-foreground"
            :class="sizeLabel(style.size) === b.label ? 'font-medium text-foreground' : 'text-muted-foreground'"
            :title="`${b.label}: ${b.from}–${b.to}px`" @click="emit('size', Math.round((b.from + b.to) / 2))"
          >{{ b.label }}</button>
        </div>
        <svg class="mt-3 h-6 w-full" viewBox="0 0 220 24" aria-hidden="true">
          <path d="M6 16 C 60 2, 110 26, 214 8" fill="none" :stroke="style.color" :stroke-width="style.size" stroke-linecap="round" />
        </svg>
      </PopoverContent>
    </Popover>

    <span class="mx-1 h-5 w-px bg-border" />
    <Button variant="ghost" size="icon-sm" aria-label="Undo" title="Undo (⌘Z)" @click="emit('undo')"><Undo2 /></Button>
    <Button v-if="!compact" variant="ghost" size="icon-sm" aria-label="Redo" title="Redo (⌘⇧Z)" @click="emit('redo')"><Redo2 /></Button>
  </div>
</template>
