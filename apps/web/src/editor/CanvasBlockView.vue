<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Box, Tldraw, createShapeId, getSnapshot, loadSnapshot, toRichText, type Editor as TLEditor } from 'tldraw'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api, errorText } from '../api'
import { shapeUtils } from './MathShape'

const props = defineProps(nodeViewProps)
const host = ref<HTMLDivElement>()
const expanded = ref(false)
const pure = ref(false)
const tool = 'rounded-md border border-stone-200 bg-white/90 px-2 py-1 text-stone-500 hover:text-stone-900 disabled:opacity-40 disabled:hover:text-stone-500'
const vtName = 'canvas-' + crypto.randomUUID().slice(0, 8)
const initial = props.node.attrs.snapshot ?? undefined
const hasSelection = ref(false)
const annotating = ref(false)
const annotateError = ref('')
let lastSynced = JSON.stringify(initial ?? null)

let root: Root | undefined
let tl: TLEditor | undefined
let stopListen: (() => void) | undefined
let stopSelection: (() => void) | undefined
let saveTimer: ReturnType<typeof setTimeout> | undefined

function save() {
  saveTimer = undefined
  if (!tl || typeof props.getPos() !== 'number') return
  const snapshot = getSnapshot(tl.store).document
  lastSynced = JSON.stringify(snapshot)
  props.updateAttributes({ snapshot })
}

// Another tab or device changed this canvas: load it, marked remote so it isn't saved straight back.
watch(() => props.node.attrs.snapshot, (snap) => {
  if (!tl || !snap) return
  const json = JSON.stringify(snap)
  if (json === lastSynced) return
  lastSynced = json
  clearTimeout(saveTimer)
  tl.store.mergeRemoteChanges(() => loadSnapshot(tl!.store, { document: snap }))
})

function onMount(editor: TLEditor) {
  tl = editor
  editor.setCameraOptions({ wheelBehavior: 'none' }) // inline: let the page scroll past the block
  stopListen = editor.store.listen(() => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 400)
  }, { source: 'user', scope: 'document' })
  stopSelection = editor.store.listen(() => (hasSelection.value = editor.getSelectedShapeIds().length > 0), { scope: 'session' })
}

function insertMath() {
  if (!tl) return
  const latex = window.prompt('LaTeX', '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}')
  if (!latex) return
  const c = tl.getViewportPageBounds().center
  tl.createShape({ type: 'math', x: c.x - 130, y: c.y - 45, props: { latex } })
}

// FR-1.4: send a picture of the selection to Claude; its note goes beside the drawing, strokes untouched.
async function annotate() {
  const ids = tl?.getSelectedShapeIds() ?? []
  const bounds = tl?.getSelectionPageBounds()
  if (!tl || !ids.length || !bounds) return
  annotating.value = true
  annotateError.value = ''
  try {
    const scale = Math.min(1, 1568 / Math.max(bounds.w, bounds.h)) // Claude's useful image size
    const { url } = await tl.toImageDataUrl(ids, { format: 'jpeg', quality: 0.85, background: true, padding: 16, scale })
    const { note } = await api<{ note: string }>('/v1/annotate', { body: { image_jpeg_base64: url.slice(url.indexOf(',') + 1) } })
    const id = createShapeId()
    tl.createShape({ id, type: 'note', x: bounds.maxX + 40, y: bounds.minY, props: { richText: toRichText(note), color: 'yellow', size: 's' } })
    const noteBounds = tl.getShapePageBounds(id)
    if (noteBounds && !tl.getViewportPageBounds().contains(noteBounds)) {
      tl.zoomToBounds(Box.Common([bounds, noteBounds]), { animation: { duration: 300 }, inset: 32 })
    }
  } catch (e) {
    annotateError.value = errorText(e)
  } finally {
    annotating.value = false
  }
}

const render = () => root?.render(createElement(Tldraw, { snapshot: initial, shapeUtils, autoFocus: false, hideUi: pure.value, onMount }))

function setExpanded(v: boolean) {
  const apply = async () => {
    expanded.value = v
    if (!v) pure.value = false
    render()
    document.body.style.overflow = v ? 'hidden' : ''
    tl?.setCameraOptions({ wheelBehavior: v ? 'pan' : 'none' })
    await nextTick()
    if (v) tl?.focus()
  }
  if (document.startViewTransition) document.startViewTransition(apply)
  else apply()
}

// 1–9 jump between frames (left→right), our camera-region bookmarks.
function goToBookmark(n: number) {
  if (!tl) return
  const frames = tl.getCurrentPageShapesSorted()
    .filter((s) => s.type === 'frame')
    .map((s) => tl!.getShapePageBounds(s)!)
    .sort((a, b) => a.x - b.x)
  if (frames[n - 1]) tl.zoomToBounds(frames[n - 1], { animation: { duration: 400 }, inset: 32 })
}

function onKey(e: KeyboardEvent) {
  if (!tl?.getIsFocused()) return
  const mod = e.metaKey || e.ctrlKey
  const idle = !tl.getEditingShapeId()
  let handled = true
  if (mod && e.shiftKey && e.key.toLowerCase() === 'e') setExpanded(!expanded.value)
  else if (!expanded.value) handled = false
  else if (mod && e.key === '\\') { pure.value = !pure.value; render() }
  else if (e.key === 'Escape' && idle && tl.getCurrentToolId() === 'select' && !tl.getSelectedShapeIds().length) setExpanded(false)
  else if (!mod && !e.shiftKey && !e.altKey && idle && /^[1-9]$/.test(e.key)) goToBookmark(+e.key)
  else handled = false
  if (handled) { e.preventDefault(); e.stopPropagation() }
}

onMounted(() => {
  root = createRoot(host.value!)
  render()
  window.addEventListener('keydown', onKey, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  if (saveTimer) { clearTimeout(saveTimer); try { save() } catch { /* node already gone */ } }
  stopListen?.()
  stopSelection?.()
  root?.unmount()
  if (expanded.value) document.body.style.overflow = ''
})
</script>

<template>
  <NodeViewWrapper
    contenteditable="false"
    class="not-prose"
    :class="expanded ? 'fixed inset-0 z-50 bg-white' : 'relative my-6'"
    :style="{ viewTransitionName: vtName }"
  >
    <!-- clicks inside a contenteditable host would otherwise leave focus on ProseMirror -->
    <div ref="host" class="w-full" @pointerdown="tl?.getIsFocused() || tl?.focus()" :class="expanded ? 'h-full' : 'h-96 overflow-hidden rounded-lg border border-stone-200'" />
    <div
      v-if="!pure"
      class="absolute z-[1000] flex gap-1 text-xs"
      :class="expanded ? 'left-1/2 top-3 -translate-x-1/2' : '-right-28 top-0 w-24 flex-col items-start'"
    >
      <button :class="tool" :title="expanded ? 'Collapse (Esc)' : 'Expand (⌘⇧E)'" @click="setExpanded(!expanded)">{{ expanded ? '⤡ Collapse' : '⤢ Expand' }}</button>
      <button :class="tool" title="Add a LaTeX equation" @click="insertMath">∑ Math</button>
      <button
        :class="tool" :disabled="!hasSelection || annotating"
        :title="hasSelection ? 'Ask AI to annotate the selected drawing' : 'Select or lasso part of the drawing first'"
        @click="annotate"
      >{{ annotating ? 'Annotating…' : 'AI Annotate' }}</button>
      <p v-if="annotateError" role="alert" class="max-w-56 rounded bg-white/90 px-1 text-amber-700">{{ annotateError }}</p>
    </div>
  </NodeViewWrapper>
</template>
