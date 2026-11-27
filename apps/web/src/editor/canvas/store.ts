import { computed, shallowRef } from 'vue'
import * as Y from 'yjs'
import { resolveEnd, sortShapes } from './geometry'
import type { Shape } from './types'

/** Edits made by this user (undoable). */
export const LOCAL = Symbol('canvas-local')
/** Bookkeeping writes such as measured text size: synced, but not on the undo stack. */
export const QUIET = Symbol('canvas-quiet')

export type ShapeMap = Y.Map<Y.Map<unknown>>
export const canvasesOf = (ydoc: Y.Doc) => ydoc.getMap<Y.Map<Y.Map<unknown>>>('canvases')

const toY = (s: Partial<Shape>) => {
  const m = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(s)) if (k !== 'id' && v !== undefined) m.set(k, v)
  return m
}

/** Reactive view of one canvas plus transactional writes. Each shape is its own Y.Map, so concurrent edits merge per field. */
export function createStore(ydoc: Y.Doc, map: ShapeMap) {
  const read = (id: string) => ({ rotation: 0, index: 0, ...map.get(id)!.toJSON(), id }) as Shape
  const shapes = shallowRef(new Map<string, Shape>([...map.keys()].map((id) => [id, read(id)])))
  const sorted = computed(() => sortShapes(shapes.value.values()))

  const onChange = (events: Y.YEvent<Y.AbstractType<unknown>>[]) => {
    const next = new Map(shapes.value)
    for (const e of events) {
      if (e.target === map) for (const [id, c] of e.changes.keys) c.action === 'delete' ? next.delete(id) : next.set(id, read(id))
      else {
        const id = e.path[0] as string
        if (map.has(id)) next.set(id, read(id))
      }
    }
    shapes.value = next
  }
  map.observeDeep(onChange)

  const undo = new Y.UndoManager(map, { trackedOrigins: new Set([LOCAL]), captureTimeout: 400 })

  // Creating and deleting are separate undo steps; only continuous updates (a drag) merge.
  function create(list: Shape[]) {
    undo.stopCapturing()
    ydoc.transact(() => list.forEach((s) => map.set(s.id, toY(s))), LOCAL)
  }

  function update(patches: Record<string, Partial<Shape>>, origin: symbol = LOCAL) {
    ydoc.transact(() => {
      for (const [id, patch] of Object.entries(patches)) {
        const m = map.get(id)
        if (!m) continue
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) m.delete(k)
          else if (JSON.stringify(m.get(k)) !== JSON.stringify(v)) m.set(k, v)
        }
      }
    }, origin)
  }

  /** Delete shapes; arrows bound to them keep the last point they were drawn at. */
  function remove(ids: Iterable<string>) {
    const gone = new Set(ids), all = shapes.value
    undo.stopCapturing()
    ydoc.transact(() => {
      for (const s of all.values()) {
        if (gone.has(s.id) || s.type !== 'arrow') continue
        for (const k of ['start', 'end'] as const) {
          const e = s[k]
          if (e?.shapeId && gone.has(e.shapeId)) map.get(s.id)!.set(k, resolveEnd(e, all))
        }
      }
      gone.forEach((id) => map.delete(id))
    }, LOCAL)
  }

  const topIndex = () => Math.max(0, ...[...shapes.value.values()].map((s) => s.index)) + 1
  const bottomIndex = () => Math.min(0, ...[...shapes.value.values()].map((s) => s.index)) - 1

  return {
    shapes, sorted, undo, create, update, remove, topIndex, bottomIndex,
    destroy: () => { map.unobserveDeep(onChange); undo.destroy() },
  }
}
export type Store = ReturnType<typeof createStore>

/** Deep copy of a canvas under a new id (a pasted or duplicated block must not share shapes with the original). */
export function cloneCanvas(ydoc: Y.Doc, fromId: string, toId: string) {
  const root = canvasesOf(ydoc), src = root.get(fromId)
  ydoc.transact(() => {
    const copy = new Y.Map<Y.Map<unknown>>()
    src?.forEach((shape, id) => copy.set(id, toY(shape.toJSON() as Partial<Shape>)))
    root.set(toId, copy)
  })
}

export const newId = () => crypto.randomUUID().slice(0, 13)
