import { Editor, type EditorOptions } from '@tiptap/vue-3'
import { nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import * as Y from 'yjs'

/**
 * Tabs are pages inside one note: same doc, same sharing. `tabs` lists them in order; the first tab of a note keeps
 * the original "default" fragment, the others live in "tab:<id>". A note that never had tabs is one tab, "default".
 * The server reads the same layout (text.rs `tabs`).
 */
export type Tab = { id: string; title: string }
export const tabsOf = (ydoc: Y.Doc) => ydoc.getArray<Y.Map<string>>('tabs')
export const fieldOf = (id: string) => (id === 'default' ? 'default' : `tab:${id}`)

export function readTabs(ydoc: Y.Doc): Tab[] {
  const seen = new Set<string>()
  const tabs = tabsOf(ydoc).toArray()
    .map((m) => ({ id: m.get('id') ?? '', title: m.get('title') ?? '' }))
    .filter((t) => t.id && !seen.has(t.id) && seen.add(t.id)) // two clients may add the same tab at once
  return tabs.length ? tabs : [{ id: 'default', title: '' }]
}

const tabMap = (t: Tab) => new Y.Map<string>(Object.entries(t))

/** Adds a tab at the end and returns its id. The first extra tab also writes down the implicit first one. */
export function addTab(ydoc: Y.Doc, title: string): string {
  const id = crypto.randomUUID().slice(0, 8)
  const arr = tabsOf(ydoc)
  ydoc.transact(() => {
    if (!arr.length) arr.push([tabMap({ id: 'default', title: '' })])
    arr.push([tabMap({ id, title })])
  })
  return id
}

export function renameTab(ydoc: Y.Doc, id: string, title: string) {
  tabsOf(ydoc).forEach((m) => m.get('id') === id && m.set('title', title))
}

/** Removes the tab and its content (canvases and files it showed are dropped from the note on the next save). */
export function removeTab(ydoc: Y.Doc, id: string) {
  const arr = tabsOf(ydoc)
  ydoc.transact(() => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr.get(i).get('id') === id) arr.delete(i, 1)
    const frag = ydoc.getXmlFragment(fieldOf(id))
    frag.delete(0, frag.length)
  })
}

/** The live tab list plus the open tab (kept in ?tab= so reloads and links land on it). */
export function useTabs(ydoc: Y.Doc) {
  const tabs = ref<Tab[]>(readTabs(ydoc))
  // ?tab= is honoured once that tab arrives with the synced doc; until then the first tab is open.
  let wanted = new URLSearchParams(location.search).get('tab')
  const active = ref(tabs.value[0].id)
  const sync = () => {
    tabs.value = readTabs(ydoc)
    // define each tab's fragment as soon as it's known, before updates to it are applied
    tabs.value.forEach((t) => ydoc.getXmlFragment(fieldOf(t.id)))
    if (wanted && tabs.value.some((t) => t.id === wanted)) [active.value, wanted] = [wanted, null]
    // the open tab was removed (here or by someone else): fall back to the first
    if (!tabs.value.some((t) => t.id === active.value)) active.value = tabs.value[0].id
  }
  tabsOf(ydoc).observeDeep(sync)
  watch(active, (id) => {
    wanted = null // picking a tab (or losing the open one) settles it
    const url = new URL(location.href)
    if (id === tabs.value[0]?.id) url.searchParams.delete('tab')
    else url.searchParams.set('tab', id)
    history.replaceState(null, '', url)
  })
  onBeforeUnmount(() => tabsOf(ydoc).unobserveDeep(sync))
  return { tabs, active, sync }
}

/** One editor for the open tab; switching tabs swaps it for an editor on that tab's fragment. */
export function useTabEditor(active: Ref<string>, options: (field: string) => Partial<EditorOptions>) {
  const editor = shallowRef<Editor>()
  watch(active, (id) => {
    const old = editor.value
    editor.value = new Editor(options(fieldOf(id)))
    // after the components bound to the old editor have unmounted
    if (old) nextTick(() => old.destroy())
  }, { immediate: true })
  onBeforeUnmount(() => editor.value?.destroy())
  return editor
}
