<script setup lang="ts">
import { Download, Maximize2, Minimize2, Sigma, Sparkles, Trash2 } from '@lucide/vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import * as Y from 'yjs'
import { api, errorText } from '../api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { confirmDialog } from '../ui/feedback'
import type { CanvasBlockOptions } from './CanvasBlock'
import Canvas from './canvas/Canvas.vue'
import { download, toSvg } from './canvas/export'
import { contains, union } from './canvas/geometry'
import { canvasesOf, cloneCanvas, type ShapeMap } from './canvas/store'

const props = defineProps(nodeViewProps)
const opts = props.extension.options as CanvasBlockOptions
const ydoc = opts.ydoc!
const root = canvasesOf(ydoc)

const canvas = ref<InstanceType<typeof Canvas>>()
const map = shallowRef<ShapeMap | null>(null)
const canvasId = ref('')
const expanded = ref(false)
const pure = ref(false)
const selectionCount = ref(0)
const annotating = ref(false)
const annotateError = ref('')
const vtName = 'canvas-' + crypto.randomUUID().slice(0, 8)
const mapVersion = ref(0) // remounts the canvas when its shape map is replaced

const synced = () => new Promise<void>((res) => {
  const p = opts.provider
  if (!p || p.synced) return res()
  p.once('sync', () => res())
})

/** Another canvas block earlier in the doc with the same id: this one is a paste or duplicate. */
function isCopy(id: string) {
  const mine = props.getPos()
  let copy = false
  props.editor.state.doc.descendants((n, pos) => {
    if (n.type.name === 'canvasBlock' && n.attrs.canvasId === id && pos < (mine ?? -1)) copy = true
    return !copy
  })
  return copy
}

async function resolve() {
  let id: string | null = props.node.attrs.canvasId
  if (id && isCopy(id)) {
    const fresh = crypto.randomUUID()
    cloneCanvas(ydoc, id, fresh)
    props.updateAttributes({ canvasId: fresh })
    return // the attribute watch resolves again
  }
  if (!id) {
    // shortcut: blocks from before the custom canvas (tldraw snapshots) start empty; pre-launch data was dropped on purpose.
    id = crypto.randomUUID()
    ydoc.transact(() => root.set(id!, new Y.Map<Y.Map<unknown>>()))
    props.updateAttributes({ canvasId: id })
    return
  }
  if (!root.get(id)) {
    await synced() // it may just not have arrived yet; only create it once we know it doesn't exist
    if (!root.get(id)) ydoc.transact(() => root.set(id!, new Y.Map<Y.Map<unknown>>()))
  }
  canvasId.value = id
  map.value = root.get(id)!
}
watch(() => props.node.attrs.canvasId, resolve, { immediate: true })
watch(map, () => mapVersion.value++)

// Two clients that created the same canvas map at once: Yjs keeps one, so follow whichever won.
const onRoot = (e: Y.YMapEvent<Y.Map<Y.Map<unknown>>>) => {
  if (canvasId.value && e.keysChanged.has(canvasId.value) && root.get(canvasId.value) !== map.value) map.value = root.get(canvasId.value) ?? null
}
root.observe(onRoot)

function setExpanded(v: boolean) {
  const apply = async () => {
    expanded.value = v
    if (!v) pure.value = false
    document.body.style.overflow = v ? 'hidden' : ''
    await nextTick()
    canvas.value?.focus()
  }
  if (document.startViewTransition) document.startViewTransition(apply)
  else apply()
}

// FR-1.4: send a picture of the selection to the AI; its note goes beside the drawing, strokes untouched.
async function annotate() {
  const c = canvas.value, bounds = c?.selectionBounds()
  if (!c || !bounds) return
  annotating.value = true
  annotateError.value = ''
  try {
    const img = await c.exportImage(c.selectedShapes(), { type: 'image/jpeg', quality: 0.85, maxSize: 1568 }) // a vision model's useful size
    if (!img) return
    const { note } = await api<{ note: string }>('/v1/annotate', { body: { image_jpeg_base64: img.url.slice(img.url.indexOf(',') + 1) } })
    const at = { x: bounds.x + bounds.w + 40, y: bounds.y }
    c.addNote(note, at)
    const both = union([bounds, { ...at, w: 200, h: 120 }])!
    if (!contains(c.viewport, both)) c.zoomToBounds(both)
  } catch (e) {
    annotateError.value = errorText(e)
  } finally {
    annotating.value = false
  }
}

async function exportAs(kind: 'png' | 'svg') {
  const c = canvas.value
  if (!c) return
  const list = c.selectedShapes().length ? c.selectedShapes() : c.all()
  if (kind === 'png') {
    const img = await c.exportImage(list)
    if (img) download(img.url, 'canvas.png')
  } else {
    const out = await toSvg(list, c.store.shapes.value, { background: true })
    if (out) download(URL.createObjectURL(new Blob([out.svg], { type: 'image/svg+xml' })), 'canvas.svg')
  }
}

async function remove() {
  if (!(await confirmDialog({ title: 'Delete this canvas?', body: 'Its drawing goes with it. Undo (⌘Z) brings it back.', confirmLabel: 'Delete canvas', danger: true }))) return
  if (expanded.value) setExpanded(false)
  props.deleteNode()
}

onBeforeUnmount(() => {
  root.unobserve(onRoot)
  if (expanded.value) document.body.style.overflow = ''
})
</script>

<template>
  <NodeViewWrapper
    contenteditable="false"
    class="not-prose"
    :class="expanded ? 'fixed inset-0 z-50 bg-background' : 'relative my-6'"
    :style="{ viewTransitionName: vtName }"
  >
    <div class="w-full" :class="expanded ? 'h-full' : 'h-96 overflow-hidden rounded-md border'">
      <Canvas
        v-if="map" :key="mapVersion" ref="canvas" :ydoc="ydoc" :map="map" :canvas-id="canvasId"
        :awareness="opts.provider?.awareness" :expanded="expanded" :pure="pure"
        @toggle-expand="setExpanded(!expanded)" @toggle-pure="pure = !pure" @collapse="setExpanded(false)" @selection="selectionCount = $event"
      />
    </div>
    <div
      v-if="!pure"
      class="absolute z-[1000] flex gap-1"
      :class="expanded ? 'left-1/2 top-3 -translate-x-1/2' : '-right-32 top-0 w-28 flex-col items-stretch'"
    >
      <Button variant="outline" size="xs" class="justify-start bg-background" :title="expanded ? 'Collapse (Esc)' : 'Expand (⌘⇧E)'" @click="setExpanded(!expanded)">
        <Minimize2 v-if="expanded" /><Maximize2 v-else />{{ expanded ? 'Collapse' : 'Expand' }}
      </Button>
      <Button variant="outline" size="xs" class="justify-start bg-background" title="Add a LaTeX equation" @click="canvas?.insertMath()"><Sigma />Math</Button>
      <Button
        variant="outline" size="xs" class="justify-start bg-background text-ai-500 hover:text-ai-700" :disabled="!selectionCount || annotating"
        :title="selectionCount ? 'Ask AI to annotate the selected drawing' : 'Select or lasso (⌥-drag) part of the drawing first'"
        @click="annotate"
      ><Sparkles />{{ annotating ? 'Annotating…' : 'AI Annotate' }}</Button>
      <DropdownMenu :modal="false">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="xs" class="justify-start bg-background" :title="selectionCount ? 'Export the selection' : 'Export the whole canvas'"><Download />Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="z-[1001]">
          <DropdownMenuItem @select="exportAs('png')">PNG image</DropdownMenuItem>
          <DropdownMenuItem @select="exportAs('svg')">SVG vector</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="xs" class="justify-start bg-background hover:bg-destructive/10 hover:text-destructive" title="Delete this canvas" @click="remove"><Trash2 />Delete</Button>
      <p v-if="annotateError" role="alert" class="max-w-56 rounded-md border bg-background px-2 py-1 text-xs text-amber-700">{{ annotateError }}</p>
    </div>
  </NodeViewWrapper>
</template>
