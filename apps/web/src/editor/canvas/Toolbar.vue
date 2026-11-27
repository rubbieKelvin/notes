<script setup lang="ts">
import { ArrowUpRight, Circle, Eraser, Frame, Hand, ImagePlus, Minus, MousePointer2, Pencil, Redo2, Square, Type, Undo2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { COLORS, SIZES, type Tool } from './types'

defineProps<{ tool: Tool; style: { color: string; size: number; fill: boolean } }>()
const emit = defineEmits<{ tool: [Tool]; color: [string]; size: [number]; fill: [boolean]; image: []; undo: []; redo: [] }>()

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
  { id: 'hand', icon: Hand, label: 'Hand', key: 'H' },
  { id: 'draw', icon: Pencil, label: 'Pen', key: 'D' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'E' },
  { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
  { id: 'line', icon: Minus, label: 'Line', key: 'L' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', key: 'A' },
  { id: 'text', icon: Type, label: 'Text', key: 'T' },
  { id: 'frame', icon: Frame, label: 'Frame', key: 'F' },
] as const
</script>

<template>
  <div class="flex items-center gap-0.5 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur" role="toolbar" aria-label="Canvas tools" @pointerdown.stop>
    <Button
      v-for="t in tools" :key="t.id" variant="ghost" size="icon-sm" :aria-label="t.label" :title="`${t.label} (${t.key})`"
      :aria-pressed="tool === t.id" :class="tool === t.id && 'bg-accent text-accent-foreground'" @click="emit('tool', t.id)"
    ><component :is="t.icon" /></Button>
    <Button variant="ghost" size="icon-sm" aria-label="Image" title="Image (I)" @click="emit('image')"><ImagePlus /></Button>
    <span class="mx-1 h-5 w-px bg-border" />
    <button
      v-for="c in COLORS" :key="c" type="button" class="size-5 rounded-full border-2 transition-transform hover:scale-110"
      :style="{ background: c, borderColor: style.color === c ? 'var(--color-ring, #a8a29e)' : 'transparent' }"
      :aria-label="`Color ${c}`" :aria-pressed="style.color === c" @click="emit('color', c)"
    />
    <span class="mx-1 h-5 w-px bg-border" />
    <Button
      v-for="(s, i) in SIZES" :key="s" variant="ghost" size="icon-sm" :aria-label="['Thin', 'Medium', 'Thick'][i]" :title="['Thin', 'Medium', 'Thick'][i]"
      :aria-pressed="style.size === s" :class="style.size === s && 'bg-accent'" @click="emit('size', s)"
    ><span class="rounded-full bg-foreground" :style="{ width: `${s + 2}px`, height: `${s + 2}px` }" /></Button>
    <Button variant="ghost" size="icon-sm" aria-label="Fill" title="Fill shapes" :aria-pressed="style.fill" :class="style.fill && 'bg-accent'" @click="emit('fill', !style.fill)">
      <Square :fill="style.fill ? 'currentColor' : 'none'" :fill-opacity="0.3" />
    </Button>
    <span class="mx-1 h-5 w-px bg-border" />
    <Button variant="ghost" size="icon-sm" aria-label="Undo" title="Undo (⌘Z)" @click="emit('undo')"><Undo2 /></Button>
    <Button variant="ghost" size="icon-sm" aria-label="Redo" title="Redo (⌘⇧Z)" @click="emit('redo')"><Redo2 /></Button>
  </div>
</template>
