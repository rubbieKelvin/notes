import type { Ref, ShallowRef } from 'vue'
import {
  bindTarget, center, contains, dist, hitTest, inBox, intersects, outline, pageBounds, pointInPolygon, rotated, scaled, translated, union,
} from './geometry'
import { newId, type Store } from './store'
import { fontSizeFor, type Box, type Pt, type Shape, type Tool } from './types'

export interface Ctx {
  store: Store
  selected: ShallowRef<Set<string>>
  draft: ShallowRef<Shape | null>
  marquee: ShallowRef<Box | null>
  lasso: ShallowRef<Pt[] | null>
  erasing: ShallowRef<Set<string>>
  editingId: Ref<string | null>
  style: { color: string; size: number; fill: boolean }
  zoom: () => number
  toPage: (clientX: number, clientY: number) => Pt
  pan: (dx: number, dy: number) => void
  setTool: (t: Tool) => void
}

export interface Gesture {
  move(p: Pt, e: PointerEvent): void
  up(p: Pt, e: PointerEvent): void
  cancel(): void
}

const round = (n: number) => Math.round(n * 100) / 100

/** Topmost shape under `p`. */
export function topHit(ctx: Ctx, p: Pt): Shape | undefined {
  const shapes = ctx.store.shapes.value, list = ctx.store.sorted.value, tol = 6 / ctx.zoom()
  for (let i = list.length - 1; i >= 0; i--) if (hitTest(list[i], p, shapes, tol)) return list[i]
}

export function selectionBounds(ctx: Ctx): Box | null {
  const shapes = ctx.store.shapes.value
  return union([...ctx.selected.value].flatMap((id) => (shapes.has(id) ? [pageBounds(shapes.get(id)!, shapes)] : [])))
}

function base(ctx: Ctx, type: Shape['type'], p: Pt, extra: Partial<Shape> = {}): Shape {
  const { color, size, fill } = ctx.style
  return { id: newId(), type, x: p.x, y: p.y, rotation: 0, index: ctx.store.topIndex(), color, size, fill, ...extra }
}

function finish(ctx: Ctx, s: Shape) {
  ctx.draft.value = null
  ctx.store.create([s])
  ctx.selected.value = new Set([s.id])
  ctx.setTool('select')
}

export function pan(ctx: Ctx, e: PointerEvent): Gesture {
  let last = { x: e.clientX, y: e.clientY }
  return {
    move(_, ev) { ctx.pan(ev.clientX - last.x, ev.clientY - last.y); last = { x: ev.clientX, y: ev.clientY } },
    up() {},
    cancel() {},
  }
}

function draw(ctx: Ctx, p: Pt, e: PointerEvent): Gesture {
  const pen = e.pointerType === 'pen'
  const pressure = (ev: PointerEvent) => (pen ? ev.pressure || 0.5 : 0.5)
  const pts = [0, 0, pressure(e)]
  const shape = base(ctx, 'draw', p, { pen, points: pts, fill: undefined })
  ctx.draft.value = shape
  return {
    move(_, ev) {
      for (const c of ev.getCoalescedEvents?.() ?? [ev]) {
        const q = ctx.toPage(c.clientX, c.clientY)
        pts.push(round(q.x - p.x), round(q.y - p.y), round(pressure(c)))
      }
      ctx.draft.value = { ...shape, points: pts }
    },
    up() {
      ctx.draft.value = null
      ctx.store.create([{ ...shape, points: pts }]) // keep drawing: the pen stays selected
    },
    cancel() { ctx.draft.value = null },
  }
}

function box(ctx: Ctx, type: 'rect' | 'ellipse' | 'frame', p: Pt): Gesture {
  const extra: Partial<Shape> = type === 'frame' ? { index: ctx.store.bottomIndex(), name: 'Frame', color: undefined, fill: undefined } : {}
  const shape = base(ctx, type, p, { w: 0, h: 0, ...extra })
  const sized = (q: Pt, square: boolean): Shape => {
    let w = q.x - p.x, h = q.y - p.y
    if (square) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m }
    return { ...shape, x: Math.min(p.x, p.x + w), y: Math.min(p.y, p.y + h), w: Math.abs(w), h: Math.abs(h) }
  }
  return {
    move(q, e) { ctx.draft.value = sized(q, e.shiftKey) },
    up(q, e) {
      let s = sized(q, e.shiftKey)
      if (s.w! * ctx.zoom() < 4 && s.h! * ctx.zoom() < 4) {
        const [w, h] = type === 'frame' ? [320, 200] : [120, 80]
        s = { ...s, x: p.x - w / 2, y: p.y - h / 2, w, h }
      }
      finish(ctx, s)
    },
    cancel() { ctx.draft.value = null },
  }
}

function line(ctx: Ctx, type: 'line' | 'arrow', p: Pt): Gesture {
  const shape = base(ctx, type, { x: 0, y: 0 }, { fill: undefined })
  const end = (q: Pt) => (type === 'arrow' ? bindTarget(q, ctx.store.sorted.value, ctx.store.shapes.value, shape.id, 4 / ctx.zoom()) : q)
  const start = end(p)
  return {
    move(q) { ctx.draft.value = { ...shape, start, end: end(q) } },
    up(q) {
      if (dist(p, q) * ctx.zoom() < 4) { ctx.draft.value = null; return }
      finish(ctx, { ...shape, start, end: end(q) })
    },
    cancel() { ctx.draft.value = null },
  }
}

function eraser(ctx: Ctx, p: Pt): Gesture {
  const hit = new Set<string>()
  let last = p
  const sweep = (q: Pt) => {
    const shapes = ctx.store.shapes.value, tol = 4 / ctx.zoom(), steps = Math.max(1, Math.ceil((dist(last, q) * ctx.zoom()) / 4))
    for (let i = 1; i <= steps; i++) {
      const s = { x: last.x + ((q.x - last.x) * i) / steps, y: last.y + ((q.y - last.y) * i) / steps }
      for (const shape of shapes.values()) if (!hit.has(shape.id) && hitTest(shape, s, shapes, tol)) hit.add(shape.id)
    }
    last = q
    ctx.erasing.value = new Set(hit)
  }
  sweep(p)
  return {
    move: sweep,
    up() { if (hit.size) ctx.store.remove(hit); ctx.erasing.value = new Set() },
    cancel() { ctx.erasing.value = new Set() },
  }
}

export function createText(ctx: Ctx, p: Pt) {
  const fontSize = fontSizeFor(ctx.style.size)
  const s = base(ctx, 'text', { x: p.x, y: p.y - fontSize * 0.7 }, { text: '', fontSize, fill: undefined, size: undefined, w: 4, h: fontSize * 1.35 })
  ctx.store.create([s])
  ctx.selected.value = new Set([s.id])
  ctx.editingId.value = s.id
  ctx.setTool('select')
}

function select(ctx: Ctx, p: Pt, e: PointerEvent): Gesture {
  const { store } = ctx, before = ctx.selected.value
  const hit = topHit(ctx, p), bounds = selectionBounds(ctx)
  if (hit || (bounds && inBox(p, bounds))) {
    const wasSelected = !!hit && before.has(hit.id)
    if (hit && !wasSelected) ctx.selected.value = e.shiftKey ? new Set([...before, hit.id]) : new Set([hit.id])
    const ids = ctx.selected.value, shapes = store.shapes.value
    const initial = [...ids].flatMap((id) => (shapes.has(id) ? [shapes.get(id)!] : []))
    let moved = false
    store.undo.stopCapturing()
    return {
      move(q) {
        const dx = q.x - p.x, dy = q.y - p.y
        if (!moved && Math.hypot(dx, dy) * ctx.zoom() < 3) return
        moved = true
        const now = store.shapes.value
        store.update(Object.fromEntries(initial.map((s) => [s.id, translated(s, dx, dy, ids, now)])))
      },
      up() {
        if (moved || !hit || !wasSelected) return
        // A click (no drag) on a selected shape: shift toggles it off, a plain click narrows to it.
        ctx.selected.value = e.shiftKey ? new Set([...before].filter((id) => id !== hit.id)) : new Set([hit.id])
      },
      cancel() {},
    }
  }

  const keep = e.shiftKey ? before : new Set<string>()
  ctx.selected.value = keep
  const pick = (test: (s: Shape) => boolean) => {
    ctx.selected.value = new Set([...keep, ...store.sorted.value.filter(test).map((s) => s.id)])
  }
  if (e.altKey) {
    const pts = [p]
    return {
      move(q) {
        pts.push(q)
        ctx.lasso.value = pts.slice()
        const shapes = store.shapes.value
        pick((s) => outline(s, shapes).every((o) => pointInPolygon(o, pts)))
      },
      up() { ctx.lasso.value = null },
      cancel() { ctx.lasso.value = null },
    }
  }
  return {
    move(q) {
      const m = { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y) }
      ctx.marquee.value = m
      const shapes = store.shapes.value
      pick((s) => { const b = pageBounds(s, shapes); return s.type === 'frame' ? contains(m, b) : intersects(m, b) })
    },
    up() { ctx.marquee.value = null },
    cancel() { ctx.marquee.value = null },
  }
}

const HANDLE_X: Record<string, -1 | 0 | 1> = { nw: -1, w: -1, sw: -1, n: 0, s: 0, ne: 1, e: 1, se: 1 }
const HANDLE_Y: Record<string, -1 | 0 | 1> = { nw: -1, n: -1, ne: -1, w: 0, e: 0, sw: 1, s: 1, se: 1 }

/** Drag a resize or rotate handle of the current selection. */
export function transform(ctx: Ctx, p: Pt, handle: string): Gesture | null {
  const { store } = ctx, shapes = store.shapes.value
  const initial = [...ctx.selected.value].flatMap((id) => (shapes.has(id) ? [shapes.get(id)!] : []))
  const b = union(initial.map((s) => pageBounds(s, shapes)))
  if (!b) return null
  store.undo.stopCapturing()
  const apply = (fn: (s: Shape) => Partial<Shape>) => store.update(Object.fromEntries(initial.map((s) => [s.id, fn(s)])))

  if (handle === 'rotate') {
    const c = center(b), a0 = Math.atan2(p.y - c.y, p.x - c.x)
    return {
      move(q, e) {
        let a = Math.atan2(q.y - c.y, q.x - c.x) - a0
        if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12)
        apply((s) => rotated(s, c, a, store.shapes.value))
      },
      up() {},
      cancel() {},
    }
  }

  const hx = HANDLE_X[handle], hy = HANDLE_Y[handle]
  const anchor = { x: hx < 0 ? b.x + b.w : b.x, y: hy < 0 ? b.y + b.h : b.y }
  const lockAspect = initial.length === 1 && ['image', 'math', 'text'].includes(initial[0].type)
  return {
    move(q, e) {
      let sx = hx && b.w ? (q.x - anchor.x) / (hx * b.w) : 1
      let sy = hy && b.h ? (q.y - anchor.y) / (hy * b.h) : 1
      if (e.shiftKey || lockAspect) {
        const m = hx && hy ? Math.max(Math.abs(sx), Math.abs(sy)) : Math.abs(hx ? sx : sy)
        sx = Math.sign(sx || 1) * m
        sy = Math.sign(sy || 1) * m
      }
      // Never collapse to zero: a zero-width shape can't be grabbed again.
      const floor = (v: number, len: number) => (Math.abs(v * len) < 1 ? Math.sign(v || 1) / Math.max(len, 1) : v)
      sx = floor(sx, b.w); sy = floor(sy, b.h)
      apply((s) => scaled(s, anchor, sx, sy, store.shapes.value))
    },
    up() {},
    cancel() {},
  }
}

export function begin(tool: Tool, ctx: Ctx, p: Pt, e: PointerEvent): Gesture | null {
  switch (tool) {
    case 'select': return select(ctx, p, e)
    case 'hand': return pan(ctx, e)
    case 'draw': return draw(ctx, p, e)
    case 'rect': case 'ellipse': case 'frame': return box(ctx, tool, p)
    case 'line': case 'arrow': return line(ctx, tool, p)
    case 'eraser': return eraser(ctx, p)
    case 'text': createText(ctx, p); return null
  }
}
