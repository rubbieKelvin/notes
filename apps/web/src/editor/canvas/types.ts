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

export const COLORS = [
  { value: '#171717', label: 'Black' },
  { value: '#78716c', label: 'Grey' },
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Yellow' },
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
] as const

/** Stroke width in page px, picked on a slider marked in these bands. */
export const SIZE_MIN = 1
export const SIZE_MAX = 12
export const SIZE_BANDS = [
  { label: 'Thin', from: 1, to: 3 },
  { label: 'Medium', from: 4, to: 6 },
  { label: 'Thick', from: 7, to: 12 },
] as const
export const sizeLabel = (size: number) => SIZE_BANDS.find((b) => size <= b.to)?.label ?? 'Thick'
/** Text follows stroke size: 2 → 16px, 4 → 21px, 8 → 32px. */
export const fontSizeFor = (size: number) => Math.round(11 + size * 2.6)

/** Shapes an arrow can attach to. */
export const BINDABLE = new Set<ShapeType>(['rect', 'ellipse', 'text', 'image', 'math', 'frame', 'note', 'draw'])
