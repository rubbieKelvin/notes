<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Tldraw, getSnapshot, type Editor as TLEditor } from 'tldraw'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps(nodeViewProps)
const host = ref<HTMLDivElement>()
const expanded = ref(false)
const pure = ref(false)
const vtName = 'canvas-' + crypto.randomUUID().slice(0, 8)
const initial = props.node.attrs.snapshot ?? undefined

let root: Root | undefined
let tl: TLEditor | undefined
let stopListen: (() => void) | undefined
let saveTimer: ReturnType<typeof setTimeout> | undefined

function save() {
  saveTimer = undefined
  if (tl && typeof props.getPos() === 'number') props.updateAttributes({ snapshot: getSnapshot(tl.store).document })
}

function onMount(editor: TLEditor) {
  tl = editor
  editor.setCameraOptions({ wheelBehavior: 'none' }) // inline: let the page scroll past the block
  stopListen = editor.store.listen(() => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 400)
  }, { source: 'user', scope: 'document' })
}

const render = () => root?.render(createElement(Tldraw, { snapshot: initial, autoFocus: false, hideUi: pure.value, onMount }))

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
    <button
      v-if="!pure"
      class="absolute z-[1000] rounded-md border border-stone-200 bg-white/90 px-2 py-1 text-xs text-stone-500 hover:text-stone-900"
      :class="expanded ? 'left-1/2 top-3 -translate-x-1/2' : '-right-20 top-0'"
      :title="expanded ? 'Collapse (Esc)' : 'Expand (⌘⇧E)'"
      @click="setExpanded(!expanded)"
    >{{ expanded ? '⤡ Collapse' : '⤢ Expand' }}</button>
  </NodeViewWrapper>
</template>
