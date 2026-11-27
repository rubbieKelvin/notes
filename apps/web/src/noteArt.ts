import { BookOpen, Brain, FileText, Lightbulb, Notebook, PenTool, Shapes, Sigma } from '@lucide/vue'

// shortcut: placeholder thumbnails (a stable color and icon per note) until thumbnails are generated from content.
const ICONS = [FileText, Notebook, Lightbulb, BookOpen, PenTool, Shapes, Sigma, Brain]
export function noteArt(id: string) {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const hue = h % 360
  return { icon: ICONS[(h >>> 9) % ICONS.length], bg: `hsl(${hue} 70% 93%)`, fg: `hsl(${hue} 45% 38%)` }
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
export function ago(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
    if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), unit)
  }
  return 'just now'
}
