import { BINDABLE, type Box, type End, type Pt, type Shape } from './types'

export type Shapes = ReadonlyMap<string, Shape>

export const rotate = (p: Pt, c: Pt, a: number): Pt => {
  if (!a) return p
  const cos = Math.cos(a), sin = Math.sin(a), dx = p.x - c.x, dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}
export const center = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function union(boxes: Box[]): Box | null {
  if (!boxes.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h) }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
export const fromPoints = (pts: Pt[]) => union(pts.map((p) => ({ x: p.x, y: p.y, w: 0, h: 0 })))!
export const intersects = (a: Box, b: Box) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
export const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h
export const inBox = (p: Pt, b: Box, pad = 0) => p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** draw shapes: their points in page space (unrotated). */
export function drawPoints(s: Shape): Pt[] {
  const p = s.points ?? [], out: Pt[] = []
  for (let i = 0; i < p.length; i += 3) out.push({ x: s.x + p[i], y: s.y + p[i + 1] })
  return out
}

/** The unrotated box a shape occupies; rotation turns it around its center. */
export function localBox(s: Shape, shapes: Shapes): Box {
  switch (s.type) {
    case 'draw': {
      const b = fromPoints(drawPoints(s).concat({ x: s.x, y: s.y })), pad = (s.size ?? 4) / 2
      return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
    }
    case 'line':
    case 'arrow': {
      const [a, b] = linePoints(s, shapes)
      return fromPoints([a, b])
    }
    default:
      return { x: s.x, y: s.y, w: s.w ?? 0, h: s.h ?? 0 }
  }
}

/** Axis-aligned page bounds, including rotation. */
export function pageBounds(s: Shape, shapes: Shapes): Box {
  const b = localBox(s, shapes)
  if (!s.rotation) return b
  const c = center(b)
  return fromPoints([{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h }].map((p) => rotate(p, c, s.rotation)))
}

/** Where a bound end sits now; falls back to its stored point when the target is gone. */
export function resolveEnd(e: End, shapes: Shapes): Pt {
  const t = e.shapeId ? shapes.get(e.shapeId) : undefined
  if (!t) return { x: e.x, y: e.y }
  const b = localBox(t, shapes)
  return rotate({ x: b.x + (e.nx ?? 0.5) * b.w, y: b.y + (e.ny ?? 0.5) * b.h }, center(b), t.rotation)
}

/** Where the segment from `from` (outside) to `to` first touches shape `t`; `to` when `from` is inside. */
export function clipToShape(from: Pt, to: Pt, t: Shape, shapes: Shapes): Pt {
  const b = localBox(t, shapes), c = center(b)
  const f = rotate(from, c, -t.rotation), g = rotate(to, c, -t.rotation)
  const dx = g.x - f.x, dy = g.y - f.y
  let hit: number | null = null
  if (t.type === 'ellipse' && b.w && b.h) {
    // Solve |(f + t·d − c) / r|² = 1 for the smaller t.
    const rx = b.w / 2, ry = b.h / 2, ox = (f.x - c.x) / rx, oy = (f.y - c.y) / ry, vx = dx / rx, vy = dy / ry
    const A = vx * vx + vy * vy, B = 2 * (ox * vx + oy * vy), C = ox * ox + oy * oy - 1
    const disc = B * B - 4 * A * C
    if (C > 0 && A && disc >= 0) hit = (-B - Math.sqrt(disc)) / (2 * A)
  } else if (!inBox(f, b)) {
    // Liang–Barsky entry parameter
    let t0 = 0, t1 = 1
    for (const [p, q] of [[-dx, f.x - b.x], [dx, b.x + b.w - f.x], [-dy, f.y - b.y], [dy, b.y + b.h - f.y]]) {
      if (p === 0) { if (q < 0) return to; continue }
      const r = q / p
      if (p < 0) t0 = Math.max(t0, r)
      else t1 = Math.min(t1, r)
    }
    if (t0 > t1) return to
    hit = t0
  }
  if (hit === null || hit < 0 || hit > 1) return to
  return rotate({ x: f.x + hit * dx, y: f.y + hit * dy }, c, t.rotation)
}

/** Line/arrow endpoints as drawn: bound ends follow their shape and stop at its edge. */
export function linePoints(s: Shape, shapes: Shapes): [Pt, Pt] {
  const start = s.start ?? { x: s.x, y: s.y }, end = s.end ?? { x: s.x, y: s.y }
  const a = resolveEnd(start, shapes), b = resolveEnd(end, shapes)
  const ta = start.shapeId ? shapes.get(start.shapeId) : undefined, tb = end.shapeId ? shapes.get(end.shapeId) : undefined
  return [ta ? clipToShape(b, a, ta, shapes) : a, tb ? clipToShape(a, b, tb, shapes) : b]
}

/** Whether page point `p` touches shape `s`, with `tol` page px of slack. */
export function hitTest(s: Shape, p: Pt, shapes: Shapes, tol: number): boolean {
  const b = localBox(s, shapes)
  const q = rotate(p, center(b), -s.rotation)
  const half = (s.size ?? 4) / 2 + tol
  switch (s.type) {
    case 'draw': {
      const pts = drawPoints(s)
      if (!inBox(q, b, tol)) return false
      if (pts.length === 1) return dist(q, pts[0]) <= half
      for (let i = 1; i < pts.length; i++) if (distToSegment(q, pts[i - 1], pts[i]) <= half) return true
      return false
    }
    case 'line':
    case 'arrow': {
      const [a, c] = linePoints(s, shapes)
      return distToSegment(q, a, c) <= half
    }
    case 'ellipse': {
      const c = center(b), rx = b.w / 2 + tol, ry = b.h / 2 + tol
      return rx > 0 && ry > 0 && ((q.x - c.x) / rx) ** 2 + ((q.y - c.y) / ry) ** 2 <= 1
    }
    case 'frame': // only the border and the name strip, so shapes inside stay clickable
      return (inBox(q, b, tol) && !inBox(q, { x: b.x + tol, y: b.y + tol, w: b.w - tol * 2, h: b.h - tol * 2 }))
        || inBox(q, { x: b.x, y: b.y - 24, w: Math.min(b.w, 200), h: 24 })
    default:
      return inBox(q, b, tol)
  }
}

/** Points that must all fall inside a lasso for the shape to be selected. */
export function outline(s: Shape, shapes: Shapes): Pt[] {
  if (s.type === 'draw') return drawPoints(s).filter((_, i, a) => i % 4 === 0 || i === a.length - 1)
  if (s.type === 'line' || s.type === 'arrow') return linePoints(s, shapes)
  const b = localBox(s, shapes), c = center(b)
  return [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h }].map((p) => rotate(p, c, s.rotation))
}

/** Topmost shape an arrow end at `p` should attach to. `sorted` is bottom-to-top. */
export function bindTarget(p: Pt, sorted: Shape[], shapes: Shapes, exclude: string, tol: number): End {
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i]
    if (s.id === exclude || !BINDABLE.has(s.type)) continue
    const b = localBox(s, shapes), q = rotate(p, center(b), -s.rotation)
    if (s.type === 'frame' ? !hitTest(s, p, shapes, tol) : !inBox(q, b, tol)) continue
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    return { x: p.x, y: p.y, shapeId: s.id, nx: b.w ? clamp((q.x - b.x) / b.w) : 0.5, ny: b.h ? clamp((q.y - b.y) / b.h) : 0.5 }
  }
  return { x: p.x, y: p.y }
}

type Patch = Partial<Shape>

/** Move by (dx, dy). An arrow end bound to a shape that isn't moving lets go, as in tldraw. */
export function translated(s: Shape, dx: number, dy: number, moving: Set<string>, shapes: Shapes): Patch {
  if (s.type !== 'line' && s.type !== 'arrow') return { x: s.x + dx, y: s.y + dy }
  const move = (e: End | undefined): End | undefined => {
    if (!e) return e
    if (e.shapeId && moving.has(e.shapeId) && shapes.has(e.shapeId)) return e
    const p = resolveEnd(e, shapes)
    return { x: p.x + dx, y: p.y + dy }
  }
  return { start: move(s.start), end: move(s.end) }
}

/** Scale about `anchor` by (sx, sy); negative flips. `s` is the shape as it was when the drag began. */
export function scaled(s: Shape, anchor: Pt, sx: number, sy: number, shapes: Shapes): Patch {
  const map = (p: Pt): Pt => ({ x: anchor.x + (p.x - anchor.x) * sx, y: anchor.y + (p.y - anchor.y) * sy })
  if (s.type === 'line' || s.type === 'arrow') {
    const end = (e: End | undefined) => (e && !e.shapeId ? { ...map(e) } : e)
    return { start: end(s.start), end: end(s.end) }
  }
  if (s.type === 'draw') {
    const o = map({ x: s.x, y: s.y }), p = (s.points ?? []).slice()
    for (let i = 0; i < p.length; i += 3) { p[i] *= sx; p[i + 1] *= sy }
    return { x: o.x, y: o.y, points: p }
  }
  const b = localBox(s, shapes), c = map(center(b))
  const w = b.w * Math.abs(sx), h = b.h * Math.abs(sy)
  if (s.type === 'text') return { x: c.x - w / 2, y: c.y - h / 2, fontSize: Math.max(4, (s.fontSize ?? 20) * Math.abs(sy)) }
  return { x: c.x - w / 2, y: c.y - h / 2, w, h }
}

/** Turn by `a` radians about `c`. */
export function rotated(s: Shape, c: Pt, a: number, shapes: Shapes): Patch {
  if (s.type === 'line' || s.type === 'arrow') {
    const end = (e: End | undefined) => (e && !e.shapeId ? { ...rotate(e, c, a) } : e)
    return { start: end(s.start), end: end(s.end) }
  }
  const b = localBox(s, shapes), from = center(b), to = rotate(from, c, a)
  return { x: s.x + to.x - from.x, y: s.y + to.y - from.y, rotation: (s.rotation + a) % (Math.PI * 2) }
}

export const sortShapes = (list: Iterable<Shape>) => [...list].sort((a, b) => a.index - b.index || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
