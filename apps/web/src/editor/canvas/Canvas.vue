<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'
import { askLatex, promptDialog, toast } from '../../ui/feedback'
import { toSvg, rasterize } from './export'
import { center, intersects, pageBounds, union } from './geometry'
import Minimap from './Minimap.vue'
import ShapeView from './ShapeView.vue'
import { createStore, newId, QUIET, type ShapeMap } from './store'
import Toolbar from './Toolbar.vue'
import { begin, createText, pan as panGesture, selectionBounds, topHit, transform, type Ctx, type Gesture } from './tools'
import { COLORS, SIZES, type Box, type Pt, type Shape, type Tool } from './types'

const props = defineProps<{ ydoc: Y.Doc; map: ShapeMap; canvasId: string; awareness?: Awareness; expanded: boolean; pure: boolean }>()
const emit = defineEmits<{ toggleExpand: []; togglePure: []; collapse: []; selection: [count: number] }>()

const store = createStore(props.ydoc, props.map)
const root = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()

// ── camera: screen = page · z + (x, y) ──
const cam = reactive({ x: 0, y: 0, z: 1 })
const size = reactive({ w: 0, h: 0 })
const clampZ = (z: number) => Math.min(8, Math.max(0.1, z))
function toPage(clientX: number, clientY: number): Pt {
  const r = root.value!.getBoundingClientRect()
  return { x: (clientX - r.left - cam.x) / cam.z, y: (clientY - r.top - cam.y) / cam.z }
}
function zoomAt(sx: number, sy: number, z: number) {
  z = clampZ(z)
  const px = (sx - cam.x) / cam.z, py = (sy - cam.y) / cam.z
  cam.z = z
  cam.x = sx - px * z
  cam.y = sy - py * z
}
const viewport = computed<Box>(() => ({ x: -cam.x / cam.z, y: -cam.y / cam.z, w: size.w / cam.z, h: size.h / cam.z }))

let anim = 0
function animateTo(to: { x: number; y: number; z: number }, ms = 300) {
  cancelAnimationFrame(anim)
  const from = { ...cam }, t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3
    cam.x = from.x + (to.x - from.x) * e
    cam.y = from.y + (to.y - from.y) * e
    cam.z = from.z + (to.z - from.z) * e
    if (k < 1) anim = requestAnimationFrame(step)
  }
  anim = requestAnimationFrame(step)
}
function zoomToBounds(b: Box, opts: { inset?: number; maxZ?: number; animate?: boolean } = {}) {
  const inset = opts.inset ?? 32
  const z = clampZ(Math.min((size.w - inset * 2) / Math.max(b.w, 1), (size.h - inset * 2) / Math.max(b.h, 1), opts.maxZ ?? 8))
  const c = center(b), to = { z, x: size.w / 2 - c.x * z, y: size.h / 2 - c.y * z }
  if (opts.animate === false) Object.assign(cam, to)
  else animateTo(to)
}
const contentBounds = () => union(store.sorted.value.map((s) => pageBounds(s, store.shapes.value)))
const centerOn = (p: Pt) => { cam.x = size.w / 2 - p.x * cam.z; cam.y = size.h / 2 - p.y * cam.z }

// ── state shared with the tools ──
const tool = ref<Tool>('select')
const style = reactive({ color: COLORS[0] as string, size: SIZES[1] as number, fill: false })
const selected = shallowRef(new Set<string>())
const draft = shallowRef<Shape | null>(null)
const marquee = shallowRef<Box | null>(null)
const lasso = shallowRef<Pt[] | null>(null)
const erasing = shallowRef(new Set<string>())
const editingId = ref<string | null>(null)
const ctx: Ctx = {
  store, selected, draft, marquee, lasso, erasing, editingId, style, toPage,
  zoom: () => cam.z,
  pan: (dx, dy) => { cam.x += dx; cam.y += dy },
  setTool: (t) => (tool.value = t),
}

// Drop selection entries whose shapes are gone (deleted here, by undo, or by someone else).
watch(store.shapes, (all) => {
  if ([...selected.value].some((id) => !all.has(id))) selected.value = new Set([...selected.value].filter((id) => all.has(id)))
  if (editingId.value && !all.has(editingId.value)) editingId.value = null
})
watch(selected, (s) => emit('selection', s.size))

// Restyling the selection follows the toolbar.
function setStyle<K extends 'color' | 'size' | 'fill'>(k: K, v: (typeof style)[K]) {
  style[k] = v
  if (!selected.value.size) return
  store.update(Object.fromEntries([...selected.value].map((id) => {
    const s = store.shapes.value.get(id)!
    if (k === 'size' && s.type === 'text') return [id, { fontSize: { 2: 16, 4: 22, 8: 32 }[v as number] }]
    return [id, { [k]: v }]
  })))
}

// ── rendering: only what's on screen ──
const boundsCache = new WeakMap<Shape, Box>()
const boundsOf = (s: Shape) => {
  if (s.type === 'arrow') return pageBounds(s, store.shapes.value) // follows other shapes, never cached
  let b = boundsCache.get(s)
  if (!b) boundsCache.set(s, (b = pageBounds(s, store.shapes.value)))
  return b
}
const visible = computed(() => {
  const v = viewport.value, m = 64 / cam.z, area = { x: v.x - m, y: v.y - m, w: v.w + m * 2, h: v.h + m * 2 }
  return store.sorted.value.filter((s) => s.id === editingId.value || intersects(boundsOf(s), area))
})
const toScreen = (b: Box): Box => ({ x: b.x * cam.z + cam.x, y: b.y * cam.z + cam.y, w: b.w * cam.z, h: b.h * cam.z })
const selBox = computed(() => {
  void store.shapes.value
  const b = selectionBounds(ctx)
  return b && !editingId.value ? toScreen(b) : null
})
const handles = computed(() => {
  const b = selBox.value
  if (!b) return []
  const xs = { w: b.x, n: b.x + b.w / 2, e: b.x + b.w }, ys = { n: b.y, w: b.y + b.h / 2, s: b.y + b.h }
  return [
    ['nw', xs.w, ys.n], ['n', xs.n, ys.n], ['ne', xs.e, ys.n], ['e', xs.e, ys.w],
    ['se', xs.e, ys.s], ['s', xs.n, ys.s], ['sw', xs.w, ys.s], ['w', xs.w, ys.w],
  ] as const
})
const CURSORS: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
const cursor = computed(() => (spaceDown.value || tool.value === 'hand' ? 'grab' : tool.value === 'select' ? 'default' : tool.value === 'text' ? 'text' : 'crosshair'))

// ── pointers ──
let gesture: Gesture | null = null
let activePointer = -1
let penSeen = false // once a pen is used, fingers only pan and zoom (palm rejection)
const touches = new Map<number, Pt>()
let pinch: { d: number; mid: Pt; cam: { x: number; y: number; z: number } } | null = null
const spaceDown = ref(false)

function startPinch() {
  const [a, b] = [...touches.values()]
  pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam: { ...cam } }
}

function onPointerDown(e: PointerEvent) {
  if ((e.target as Element).closest('[data-chrome]')) return // toolbar, minimap
  if (!(e.target as Element).closest('[contenteditable=plaintext-only]')) root.value!.focus({ preventScroll: true }) // not while typing in a text shape
  if (e.pointerType === 'pen') penSeen = true
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.size === 2) { gesture?.cancel(); gesture = null; startPinch(); return }
    if (touches.size > 2) return
  }
  if (gesture) return
  const p = toPage(e.clientX, e.clientY)
  const handle = (e.target as Element).closest('[data-handle]')?.getAttribute('data-handle')
  if (e.button === 1 || spaceDown.value || (e.pointerType === 'touch' && penSeen)) gesture = panGesture(ctx, e)
  else if (e.button !== 0) return
  else if (handle) gesture = transform(ctx, p, handle)
  else gesture = begin(tool.value, ctx, p, e)
  if (!gesture) return
  activePointer = e.pointerId
  try { root.value!.setPointerCapture(e.pointerId) } catch { /* synthetic or already-released pointer */ }
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== 'touch' || !penSeen) shareCursor(toPage(e.clientX, e.clientY))
  if (touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()], r = root.value!.getBoundingClientRect()
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z = clampZ(pinch.cam.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d))
      // keep the page point that was under the fingers' midpoint under it
      const px = (pinch.mid.x - r.left - pinch.cam.x) / pinch.cam.z, py = (pinch.mid.y - r.top - pinch.cam.y) / pinch.cam.z
      Object.assign(cam, { z, x: mid.x - r.left - px * z, y: mid.y - r.top - py * z })
      return
    }
  }
  if (gesture && e.pointerId === activePointer) gesture.move(toPage(e.clientX, e.clientY), e)
}

function onPointerUp(e: PointerEvent) {
  touches.delete(e.pointerId)
  if (touches.size < 2) pinch = null
  if (gesture && e.pointerId === activePointer) {
    const g = gesture
    gesture = null
    g.up(toPage(e.clientX, e.clientY), e)
    shareDraft()
  }
}

function onPointerCancel(e: PointerEvent) {
  touches.delete(e.pointerId)
  if (touches.size < 2) pinch = null
  if (e.pointerId === activePointer) { gesture?.cancel(); gesture = null }
}

function onWheel(e: WheelEvent) {
  const r = root.value!.getBoundingClientRect()
  if (e.ctrlKey || e.metaKey) {
    // trackpad pinch (and ctrl+wheel); otherwise the browser would zoom the whole page
    e.preventDefault()
    zoomAt(e.clientX - r.left, e.clientY - r.top, cam.z * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)))
  } else if (props.expanded) {
    e.preventDefault()
    const k = e.deltaMode === 1 ? 16 : 1
    cam.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k
    cam.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k
  } // inline: let the page scroll past the block
}

// Safari's trackpad pinch arrives as gesture events, not ctrl+wheel.
let gestureZ = 1
type SafariGesture = UIEvent & { scale: number; clientX: number; clientY: number }
const onGestureStart = (e: Event) => { e.preventDefault(); gestureZ = cam.z }
const onGestureChange = (e: Event) => {
  e.preventDefault()
  const g = e as SafariGesture, r = root.value!.getBoundingClientRect()
  zoomAt(g.clientX - r.left, g.clientY - r.top, gestureZ * g.scale)
}

function onDoubleClick(e: MouseEvent) {
  if (tool.value !== 'select') return
  const p = toPage(e.clientX, e.clientY), hit = topHit(ctx, p)
  if (!hit) return createText(ctx, p)
  if (hit.type === 'text' || hit.type === 'note') { selected.value = new Set([hit.id]); editingId.value = hit.id }
  else if (hit.type === 'math') editMath(hit)
  else if (hit.type === 'frame') renameFrame(hit)
}

async function editMath(s: Shape) {
  const latex = await askLatex(s.latex ?? '')
  if (latex && latex !== s.latex) store.update({ [s.id]: { latex } })
}
async function renameFrame(s: Shape) {
  const name = await promptDialog({ title: 'Rename frame', label: 'Name', value: s.name ?? '', confirmLabel: 'Rename' })
  if (name !== null) store.update({ [s.id]: { name: name.trim() || 'Frame' } })
}

function commitText(s: Shape, text: string) {
  editingId.value = null
  if (!text.trim()) store.remove([s.id])
  else if (text !== s.text) store.update({ [s.id]: { text } })
  root.value?.focus({ preventScroll: true })
}

// ── keyboard ──
const TOOL_KEYS: Record<string, Tool> = { v: 'select', h: 'hand', d: 'draw', p: 'draw', e: 'eraser', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow', t: 'text', f: 'frame' }

function goToFrame(n: number) {
  const frames = store.sorted.value.filter((s) => s.type === 'frame').map((s) => pageBounds(s, store.shapes.value)).sort((a, b) => a.x - b.x)
  if (frames[n - 1]) zoomToBounds(frames[n - 1])
}

function selectedShapes() {
  return [...selected.value].flatMap((id) => (store.shapes.value.has(id) ? [store.shapes.value.get(id)!] : []))
}

/** Copies of `list` with new ids, offset, on top; arrows between copied shapes stay attached to the copies. */
function duplicate(list: Shape[], offset: Pt) {
  const ids = new Map(list.map((s) => [s.id, newId()]))
  let index = store.topIndex()
  const sorted = [...list].sort((a, b) => a.index - b.index)
  const copies = sorted.map((s): Shape => {
    const end = (e: Shape['start']) => e && (e.shapeId && ids.has(e.shapeId)
      ? { ...e, shapeId: ids.get(e.shapeId), x: e.x + offset.x, y: e.y + offset.y }
      : { x: e.x + offset.x, y: e.y + offset.y })
    const moved = s.type === 'line' || s.type === 'arrow' ? { start: end(s.start), end: end(s.end) } : { x: s.x + offset.x, y: s.y + offset.y }
    return { ...s, ...moved, id: ids.get(s.id)!, index: index++ }
  })
  // an arrow bound outside the copy: draw it where it is now, unattached
  for (const c of copies) for (const k of ['start', 'end'] as const) {
    const e = c[k]
    if (e?.shapeId && ![...ids.values()].includes(e.shapeId)) c[k] = { x: e.x + offset.x, y: e.y + offset.y }
  }
  store.create(copies)
  selected.value = new Set(copies.map((c) => c.id))
}

function onKeyDown(e: KeyboardEvent) {
  if (editingId.value || (e.target as HTMLElement).isContentEditable) return
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase()
  const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k]
  if (mod && e.shiftKey && k === 'e') emit('toggleExpand')
  else if (mod && e.key === '\\') { if (props.expanded) emit('togglePure') }
  else if (mod && k === 'z') e.shiftKey ? store.undo.redo() : store.undo.undo()
  else if (mod && k === 'y') store.undo.redo()
  else if (mod && k === 'a') selected.value = new Set(store.sorted.value.map((s) => s.id))
  else if (mod && k === 'd') duplicate(selectedShapes(), { x: 16, y: 16 })
  else if (mod && k === '0') zoomAt(size.w / 2, size.h / 2, 1)
  else if (mod && (k === '=' || k === '+')) zoomAt(size.w / 2, size.h / 2, cam.z * 1.25)
  else if (mod && k === '-') zoomAt(size.w / 2, size.h / 2, cam.z / 1.25)
  else if (mod && k === '1') { const b = contentBounds(); if (b) zoomToBounds(b) }
  else if (mod) return // ⌘C/⌘V/⌘X arrive as clipboard events
  else if (k === 'delete' || k === 'backspace') store.remove(selected.value)
  else if (k === 'escape') {
    if (gesture) { gesture.cancel(); gesture = null }
    else if (selected.value.size) selected.value = new Set()
    else if (tool.value !== 'select') tool.value = 'select'
    else if (props.expanded) emit('collapse')
    else return
  }
  else if (nudge && selected.value.size) {
    const d = e.shiftKey ? 10 : 1
    store.update(Object.fromEntries(selectedShapes().map((s) => [s.id, s.type === 'line' || s.type === 'arrow'
      ? { start: s.start && { ...s.start, x: s.start.x + nudge[0] * d, y: s.start.y + nudge[1] * d }, end: s.end && { ...s.end, x: s.end.x + nudge[0] * d, y: s.end.y + nudge[1] * d } }
      : { x: s.x + nudge[0] * d, y: s.y + nudge[1] * d }])))
  }
  else if (k === ' ') spaceDown.value = true
  else if (/^[1-9]$/.test(k) && !e.altKey && !e.shiftKey) goToFrame(+k)
  else if (k === 'i') fileInput.value?.click()
  else if (TOOL_KEYS[k] && !e.altKey) tool.value = TOOL_KEYS[k]
  else return
  e.preventDefault()
  e.stopPropagation()
}
const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') spaceDown.value = false }

// ── clipboard, drop, images ──
const CLIP = 'opennotes/canvas'
function onCopy(e: ClipboardEvent, cut = false) {
  if (editingId.value || !selected.value.size) return
  e.clipboardData!.setData('text/plain', JSON.stringify({ [CLIP]: 1, shapes: selectedShapes() }))
  e.preventDefault()
  if (cut) store.remove(selected.value)
}
const viewCenter = (): Pt => ({ x: viewport.value.x + viewport.value.w / 2, y: viewport.value.y + viewport.value.h / 2 })
function onPaste(e: ClipboardEvent) {
  if (editingId.value) return
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
  const text = e.clipboardData?.getData('text/plain') ?? ''
  e.preventDefault()
  if (files.length) return void addImages(files, viewCenter())
  try {
    const data = JSON.parse(text)
    if (data?.[CLIP] && Array.isArray(data.shapes)) {
      const list = data.shapes as Shape[], b = union(list.map((s) => pageBounds(s, new Map(list.map((x) => [x.id, x])))))
      const c = viewCenter()
      return duplicate(list, b ? { x: c.x - (b.x + b.w / 2), y: c.y - (b.y + b.h / 2) } : { x: 16, y: 16 })
    }
  } catch { /* not ours: plain text */ }
  if (!text.trim()) return
  const c = viewCenter(), id = newId()
  store.create([{ id, type: 'text', x: c.x, y: c.y, rotation: 0, index: store.topIndex(), text, fontSize: 22, color: style.color }])
  selected.value = new Set([id])
}
function onDrop(e: DragEvent) {
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'))
  if (!files.length) return
  e.preventDefault()
  addImages(files, toPage(e.clientX, e.clientY))
}
function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  addImages([...(input.files ?? [])], viewCenter())
  input.value = ''
}

async function addImages(files: File[], at: Pt) {
  for (const [i, file] of files.entries()) {
    try {
      const bmp = await createImageBitmap(file)
      const k = Math.min(1, 600 / Math.max(bmp.width, bmp.height)), w = bmp.width * k, h = bmp.height * k
      bmp.close()
      const res = await fetch('/v1/assets', { method: 'POST', body: file })
      if (!res.ok) throw new Error((await res.text()) || res.statusText)
      const { url } = (await res.json()) as { url: string }
      const id = newId()
      store.create([{ id, type: 'image', src: url, x: at.x - w / 2 + i * 24, y: at.y - h / 2 + i * 24, w, h, rotation: 0, index: store.topIndex() }])
      selected.value = new Set([id])
    } catch (err) {
      toast(`Couldn't add ${file.name}: ${err instanceof Error ? err.message : err}`, 'error')
    }
  }
}

// ── presence: other people's cursors and in-progress strokes ──
type Presence = { cursor: Pt | null; draft: Shape | null }
const presenceKey = `canvas:${props.canvasId}`
const remotes = shallowRef<{ id: number; name: string; color: string; cursor: Pt | null; draft: Shape | null }[]>([])
let lastPresence: Presence = { cursor: null, draft: null }
let presenceTimer: ReturnType<typeof setTimeout> | undefined
function sharePresence(p: Partial<Presence>) {
  if (!props.awareness) return
  lastPresence = { ...lastPresence, ...p }
  presenceTimer ??= setTimeout(() => { presenceTimer = undefined; props.awareness?.setLocalStateField(presenceKey, lastPresence) }, 50)
}
const shareCursor = (p: Pt | null) => sharePresence({ cursor: p, draft: draft.value })
const shareDraft = () => sharePresence({ draft: draft.value })
watch(draft, shareDraft)
function readRemotes() {
  const a = props.awareness
  if (!a) return
  const list: typeof remotes.value = []
  a.getStates().forEach((st, id) => {
    const p = st[presenceKey] as Presence | undefined
    if (id === a.clientID || !p || (!p.cursor && !p.draft)) return
    const user = (st.user ?? {}) as { name?: string; color?: string }
    list.push({ id, name: user.name ?? 'Someone', color: user.color ?? '#7c3aed', cursor: p.cursor, draft: p.draft })
  })
  remotes.value = list
}

// ── lifecycle ──
let resize: ResizeObserver | undefined
onMounted(() => {
  const el = root.value!
  resize = new ResizeObserver(([e]) => {
    const first = !size.w
    size.w = e.contentRect.width
    size.h = e.contentRect.height
    if (first) { const b = contentBounds(); if (b) zoomToBounds(b, { maxZ: 1, animate: false }) }
  })
  resize.observe(el)
  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('gesturestart', onGestureStart)
  el.addEventListener('gesturechange', onGestureChange)
  props.awareness?.on('change', readRemotes)
  readRemotes()
})
onBeforeUnmount(() => {
  resize?.disconnect()
  cancelAnimationFrame(anim)
  clearTimeout(presenceTimer)
  props.awareness?.off('change', readRemotes)
  props.awareness?.setLocalStateField(presenceKey, null)
  store.destroy()
})

// ── for the block around us ──
async function exportImage(list: Shape[], opts: { type?: 'image/png' | 'image/jpeg'; quality?: number; maxSize?: number } = {}) {
  const out = await toSvg(list, store.shapes.value, { padding: 16, background: true })
  if (!out) return null
  const scale = opts.maxSize ? Math.min(2, opts.maxSize / Math.max(out.w, out.h)) : 2
  return { url: await rasterize(out.svg, out.w, out.h, { scale, type: opts.type, quality: opts.quality }), bounds: out.bounds }
}
async function insertMath() {
  const latex = await askLatex()
  if (!latex) return
  const c = viewCenter(), id = newId()
  store.create([{ id, type: 'math', latex, x: c.x - 130, y: c.y - 45, w: 260, h: 90, rotation: 0, index: store.topIndex(), color: style.color }])
  selected.value = new Set([id])
}
function addNote(text: string, at: Pt) {
  const id = newId()
  store.create([{ id, type: 'note', text, x: at.x, y: at.y, w: 200, h: 80, rotation: 0, index: store.topIndex() }])
  return id
}
defineExpose({
  store, selectedShapes, exportImage, insertMath, addNote, zoomToBounds, viewport,
  all: () => store.sorted.value,
  selectionBounds: () => selectionBounds(ctx),
  focus: () => root.value?.focus({ preventScroll: true }),
})
</script>

<template>
  <div
    ref="root" tabindex="0" data-canvas class="relative h-full w-full touch-none overflow-hidden bg-background outline-none select-none"
    :style="{ cursor }" aria-label="Canvas" role="application"
    @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerCancel"
    @pointerleave="shareCursor(null)" @dblclick="onDoubleClick" @keydown="onKeyDown" @keyup="onKeyUp"
    @copy="onCopy" @cut="onCopy($event, true)" @paste="onPaste" @dragover.prevent @drop="onDrop"
  >
    <svg class="absolute inset-0 h-full w-full">
      <g :transform="`matrix(${cam.z} 0 0 ${cam.z} ${cam.x} ${cam.y})`">
        <ShapeView
          v-for="s in visible" :key="s.id" :shape="s" :shapes="s.type === 'arrow' ? store.shapes.value : undefined"
          :editing="editingId === s.id" :erasing="erasing.has(s.id)"
          @commit="commitText(s, $event)" @autosize="store.update({ [s.id]: $event }, QUIET)"
        />
        <ShapeView v-if="draft" :shape="draft" :shapes="store.shapes.value" />
        <g v-for="r in remotes" :key="r.id">
          <ShapeView v-if="r.draft" :shape="r.draft" :shapes="store.shapes.value" opacity="0.6" />
          <g v-if="r.cursor" :transform="`translate(${r.cursor.x} ${r.cursor.y}) scale(${1 / cam.z})`" data-remote-cursor>
            <path d="M0 0 L0 16 L4.5 12 L8 19 L10.5 18 L7 11 L13 11 Z" :fill="r.color" stroke="#fff" stroke-width="1.5" />
            <text x="14" y="26" font-size="11" :fill="r.color" font-family="Inter Variable, system-ui, sans-serif">{{ r.name }}</text>
          </g>
        </g>
      </g>
      <!-- selection chrome stays a constant size on screen -->
      <rect v-if="marquee" :x="marquee.x * cam.z + cam.x" :y="marquee.y * cam.z + cam.y" :width="marquee.w * cam.z" :height="marquee.h * cam.z" fill="rgb(37 99 235 / 0.08)" stroke="#2563eb" stroke-width="1" />
      <polyline v-if="lasso" :points="lasso.map((p) => `${p.x * cam.z + cam.x},${p.y * cam.z + cam.y}`).join(' ')" fill="rgb(37 99 235 / 0.08)" stroke="#2563eb" stroke-dasharray="4 3" />
      <g v-if="selBox && tool === 'select'" data-selection>
        <rect :x="selBox.x" :y="selBox.y" :width="selBox.w" :height="selBox.h" fill="none" stroke="#2563eb" stroke-width="1.5" pointer-events="none" />
        <line :x1="selBox.x + selBox.w / 2" :y1="selBox.y" :x2="selBox.x + selBox.w / 2" :y2="selBox.y - 20" stroke="#2563eb" />
        <circle data-handle="rotate" :cx="selBox.x + selBox.w / 2" :cy="selBox.y - 24" r="5" fill="#fff" stroke="#2563eb" stroke-width="1.5" style="cursor: grab" />
        <rect
          v-for="[id, x, y] in handles" :key="id" :data-handle="id" :x="x - 4" :y="y - 4" width="8" height="8"
          fill="#fff" stroke="#2563eb" stroke-width="1.5" :style="{ cursor: CURSORS[id] }"
        />
      </g>
    </svg>

    <div v-if="!pure" data-chrome class="absolute bottom-3 left-1/2 -translate-x-1/2">
      <Toolbar
        :tool="tool" :style="style" @tool="tool = $event" @color="setStyle('color', $event)" @size="setStyle('size', $event)"
        @fill="setStyle('fill', $event)" @image="fileInput?.click()" @undo="store.undo.undo()" @redo="store.undo.redo()"
      />
    </div>
    <div v-if="expanded && !pure" data-chrome class="absolute right-3 bottom-3">
      <Minimap :sorted="store.sorted.value" :shapes="store.shapes.value" :content="contentBounds()" :viewport="viewport" @center="centerOn" />
    </div>
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden @change="onFiles" />
  </div>
</template>
