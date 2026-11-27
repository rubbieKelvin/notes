/** One canvas = `ydoc.getMap('canvases').get(canvasId)`: a Y.Map of shape id → Y.Map of these fields. */
export type ShapeType = 'draw' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'image' | 'math' | 'frame' | 'note'

export type Pt = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }
/** A line/arrow end. `x,y` is always the absolute point; with `shapeId` it follows that shape (nx,ny in 0–1 of its box). */
export type End = Pt & { shapeId?: string; nx?: number; ny?: number }

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  /** z-order; ties broken by id so every client agrees. */
  index: number
  w?: number
  h?: number
  color?: string
  /** Stroke width in page px. */
  size?: number
  fill?: boolean
  /** draw: flat [x, y, pressure, …] relative to (x, y). */
  points?: number[]
  /** draw: true when pressure came from a pen, false to simulate it from speed. */
  pen?: boolean
  start?: End
  end?: End
  text?: string
  fontSize?: number
  src?: string
  latex?: string
  name?: string
}

export type Tool = 'select' | 'hand' | 'draw' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'eraser' | 'frame'

export const COLORS = ['#1c1917', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed'] as const
export const SIZES = [2, 4, 8] as const

/** Shapes an arrow can attach to. */
export const BINDABLE = new Set<ShapeType>(['rect', 'ellipse', 'text', 'image', 'math', 'frame', 'note', 'draw'])
