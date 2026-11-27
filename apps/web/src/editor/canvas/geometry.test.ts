import { describe, expect, it } from 'vitest'
import { bindTarget, hitTest, linePoints, outline, pageBounds, pointInPolygon, rotated, scaled, sortShapes, translated } from './geometry'
import type { Shape } from './types'

const shape = (s: Partial<Shape> & Pick<Shape, 'id' | 'type'>): Shape => ({ x: 0, y: 0, rotation: 0, index: 0, ...s })
const rect = shape({ id: 'r', type: 'rect', x: 100, y: 100, w: 100, h: 50 })
const oval = shape({ id: 'o', type: 'ellipse', x: 300, y: 100, w: 100, h: 100 })
const all = (...list: Shape[]) => new Map(list.map((s) => [s.id, s]))

describe('hit testing', () => {
  it('boxes, ellipses and rotation', () => {
    const m = all(rect, oval)
    expect(hitTest(rect, { x: 150, y: 125 }, m, 0)).toBe(true)
    expect(hitTest(rect, { x: 90, y: 125 }, m, 0)).toBe(false)
    expect(hitTest(rect, { x: 90, y: 125 }, m, 12)).toBe(true)
    expect(hitTest(oval, { x: 305, y: 105 }, m, 0)).toBe(false) // box corner, outside the ellipse
    expect(hitTest(oval, { x: 350, y: 150 }, m, 0)).toBe(true)
    const turned = { ...rect, rotation: Math.PI / 2 } // now 50 wide, 100 tall about (150,125)
    expect(hitTest(turned, { x: 150, y: 170 }, all(turned), 0)).toBe(true)
    expect(hitTest(turned, { x: 195, y: 125 }, all(turned), 0)).toBe(false)
  })

  it('strokes by distance to the polyline', () => {
    const d = shape({ id: 'd', type: 'draw', x: 10, y: 10, size: 4, points: [0, 0, 0.5, 100, 0, 0.5] })
    expect(hitTest(d, { x: 60, y: 11 }, all(d), 0)).toBe(true)
    expect(hitTest(d, { x: 60, y: 20 }, all(d), 2)).toBe(false)
  })

  it('frames only by border and label, so their contents stay clickable', () => {
    const f = shape({ id: 'f', type: 'frame', x: 0, y: 0, w: 300, h: 200 })
    expect(hitTest(f, { x: 150, y: 100 }, all(f), 4)).toBe(false)
    expect(hitTest(f, { x: 1, y: 100 }, all(f), 4)).toBe(true)
    expect(hitTest(f, { x: 20, y: -10 }, all(f), 4)).toBe(true)
  })
})

describe('arrows', () => {
  it('bind to the topmost shape and follow it, stopping at its edge', () => {
    const end = bindTarget({ x: 150, y: 125 }, [rect], all(rect), 'a', 4)
    expect(end).toMatchObject({ shapeId: 'r', nx: 0.5, ny: 0.5 })
    const a = shape({ id: 'a', type: 'arrow', start: { x: 0, y: 125 }, end })
    expect(linePoints(a, all(rect, a))[1]).toEqual({ x: 100, y: 125 }) // clipped to the left edge
    const moved = { ...rect, y: 300 }
    const hit = linePoints(a, all(moved, a))[1] // enters the moved box through its top edge
    expect(hit.y).toBeCloseTo(300)
    expect(hit.x).toBeCloseTo(131.25)
  })

  it('stop at an ellipse outline', () => {
    const a = shape({ id: 'a', type: 'arrow', start: { x: 200, y: 150 }, end: { x: 350, y: 150, shapeId: 'o', nx: 0.5, ny: 0.5 } })
    expect(linePoints(a, all(oval, a))[1].x).toBeCloseTo(300)
  })

  it('fall back to their stored point when the target is gone', () => {
    const a = shape({ id: 'a', type: 'arrow', start: { x: 0, y: 0 }, end: { x: 7, y: 9, shapeId: 'gone' } })
    expect(linePoints(a, all(a))[1]).toEqual({ x: 7, y: 9 })
  })

  it('let go of a shape that is not moving with them', () => {
    const a = shape({ id: 'a', type: 'arrow', start: { x: 0, y: 0 }, end: { x: 150, y: 125, shapeId: 'r', nx: 0.5, ny: 0.5 } })
    const alone = translated(a, 10, 0, new Set(['a']), all(rect, a))
    expect(alone.end).toEqual({ x: 160, y: 125 })
    const together = translated(a, 10, 0, new Set(['a', 'r']), all(rect, a))
    expect(together.end?.shapeId).toBe('r')
  })
})

describe('transforms', () => {
  it('scale about an anchor, flipping on negative factors', () => {
    expect(scaled(rect, { x: 100, y: 100 }, 2, 2, all(rect))).toEqual({ x: 100, y: 100, w: 200, h: 100 })
    expect(scaled(rect, { x: 100, y: 100 }, -1, 1, all(rect))).toEqual({ x: 0, y: 100, w: 100, h: 50 })
  })

  it('rotate about a center', () => {
    const r = rotated(rect, { x: 150, y: 125 }, Math.PI, all(rect))
    expect(r.x).toBeCloseTo(100)
    expect(r.rotation).toBeCloseTo(Math.PI)
    const b = pageBounds({ ...rect, rotation: Math.PI / 2 }, all(rect))
    expect(b.w).toBeCloseTo(50)
    expect(b.h).toBeCloseTo(100)
  })
})

it('lasso needs the whole outline inside', () => {
  const poly = [{ x: 90, y: 90 }, { x: 210, y: 90 }, { x: 210, y: 160 }, { x: 90, y: 160 }]
  expect(outline(rect, all(rect)).every((p) => pointInPolygon(p, poly))).toBe(true)
  expect(outline(oval, all(oval)).every((p) => pointInPolygon(p, poly))).toBe(false)
})

it('z-order is index then id, the same on every client', () => {
  const list = [shape({ id: 'b', type: 'rect', index: 1 }), shape({ id: 'a', type: 'rect', index: 1 }), shape({ id: 'c', type: 'rect', index: 0 })]
  expect(sortShapes(list).map((s) => s.id)).toEqual(['c', 'a', 'b'])
})
