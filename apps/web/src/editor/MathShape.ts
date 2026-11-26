import katex from 'katex'
import { createElement } from 'react'
import { BaseBoxShapeUtil, HTMLContainer, T, type TLShape } from 'tldraw'
import { askLatex } from '../ui/feedback'

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    math: { w: number; h: number; latex: string }
  }
}

type MathShape = TLShape<'math'>

/** FR-2.2: rendered LaTeX living next to freehand strokes. Double-click to edit. */
export class MathShapeUtil extends BaseBoxShapeUtil<MathShape> {
  static type = 'math' as const
  static props = { w: T.number, h: T.number, latex: T.string }

  getDefaultProps(): MathShape['props'] {
    return { w: 260, h: 90, latex: 'E = mc^2' }
  }

  onDoubleClick(shape: MathShape) {
    askLatex(shape.props.latex).then((latex) => {
      if (latex && latex !== shape.props.latex) this.editor.updateShape({ id: shape.id, type: 'math', props: { latex } })
    })
  }

  component(shape: MathShape) {
    // KaTeX escapes input and, with trust off (default), emits no links or scripts.
    const html = katex.renderToString(shape.props.latex, { throwOnError: false, displayMode: true })
    return createElement(HTMLContainer, {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#1c1917' },
      dangerouslySetInnerHTML: { __html: html },
    })
  }

  getIndicatorPath(shape: MathShape) {
    const p = new Path2D()
    p.rect(0, 0, shape.props.w, shape.props.h)
    return p
  }
}

export const shapeUtils = [MathShapeUtil]
