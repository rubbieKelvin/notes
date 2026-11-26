<script setup lang="ts">
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Placeholder } from '@tiptap/extensions'
import { StarterKit } from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { common, createLowlight } from 'lowlight'
import { onBeforeUnmount, ref, watch } from 'vue'
import { CanvasBlock } from './editor/CanvasBlock'
import { SlashCommand } from './editor/SlashCommand'

// shortcut: single doc in localStorage, replace with yrs sync over WebSocket in Phase 3.
const KEY = 'opennotes:doc'
const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
const title = ref<string>(saved?.title ?? '')

const editLatex = (latex: string) => window.prompt('LaTeX', latex)

const editor = useEditor({
  content: saved?.content ?? '',
  autofocus: 'end',
  editorProps: { attributes: { class: 'prose prose-stone max-w-none' } },
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: "Type '/' for commands…" }),
    Mathematics.configure({
      inlineOptions: { onClick: (node, pos) => { const latex = editLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run() } },
      blockOptions: { onClick: (node, pos) => { const latex = editLatex(node.attrs.latex); if (latex) editor.value?.chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run() } },
    }),
    CanvasBlock,
    SlashCommand,
  ],
  onUpdate: () => scheduleSave(),
})

let timer: ReturnType<typeof setTimeout> | undefined
function persist() {
  timer = undefined
  if (editor.value) localStorage.setItem(KEY, JSON.stringify({ title: title.value, content: editor.value.getJSON() }))
}
function scheduleSave() { clearTimeout(timer); timer = setTimeout(persist, 300) }
const flush = () => timer && persist()

watch(title, (t) => { document.title = t ? `${t} · opennotes` : 'opennotes'; scheduleSave() }, { immediate: true })
window.addEventListener('beforeunload', flush)
onBeforeUnmount(() => { flush(); window.removeEventListener('beforeunload', flush); editor.value?.destroy() })

const marks = [
  { name: 'bold', label: 'B', cls: 'font-bold' },
  { name: 'italic', label: 'I', cls: 'italic' },
  { name: 'strike', label: 'S', cls: 'line-through' },
  { name: 'code', label: '</>', cls: 'font-mono' },
] as const
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 flex items-center px-4 py-3 text-sm">
    <div class="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-stone-400 backdrop-blur">
      <span>opennotes</span><span>/</span>
      <input v-model="title" placeholder="Untitled" aria-label="Page title" class="w-48 bg-transparent text-stone-700 outline-none placeholder:text-stone-400" />
    </div>
  </header>

  <main class="mx-auto max-w-2xl px-6 pt-28">
    <BubbleMenu v-if="editor" :editor="editor" class="flex gap-0.5 rounded-lg border border-stone-200 bg-white p-1 shadow-md">
      <button
        v-for="m in marks" :key="m.name" :aria-label="m.name" :aria-pressed="editor.isActive(m.name)"
        class="min-w-7 rounded px-1.5 py-0.5 text-sm hover:bg-stone-100" :class="[m.cls, editor.isActive(m.name) && 'bg-stone-100']"
        @click="editor.chain().focus().toggleMark(m.name).run()"
      >{{ m.label }}</button>
    </BubbleMenu>
    <EditorContent :editor="editor" />
  </main>
</template>
