import { getStroke } from 'perfect-freehand'
import type { Pt, Shape } from './types'

/** Filled outline of a freehand stroke, in the shape's own coordinates. */
export function strokePath(s: Shape, last = true): string {
  const p = s.points ?? [], input: number[][] = []
  for (let i = 0; i < p.length; i += 3) input.push([p[i], p[i + 1], p[i + 2]])
  const outline = getStroke(input, {
    size: (s.size ?? 4) * 2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: !s.pen,
    last,
  })
  if (!outline.length) return ''
  // Quadratic curves through the midpoints keep the outline smooth at any zoom.
  let d = `M${outline[0][0].toFixed(2)},${outline[0][1].toFixed(2)}Q`
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i], [x1, y1] = outline[(i + 1) % outline.length]
    d += `${x0.toFixed(2)},${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)},${((y0 + y1) / 2).toFixed(2)} `
  }
  return d + 'Z'
}

/** Two short strokes forming an arrowhead at `b`, pointing away from `a`. */
export function arrowHead(a: Pt, b: Pt, size: number): string {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.min(10 + size * 3, Math.hypot(b.x - a.x, b.y - a.y) / 2)
  const p = (d: number) => `${b.x - len * Math.cos(ang + d)},${b.y - len * Math.sin(ang + d)}`
  return `M${p(0.5)} L${b.x},${b.y} L${p(-0.5)}`
}
