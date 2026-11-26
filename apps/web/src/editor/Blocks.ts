import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ClipView from './ClipView.vue'
import RunbookView from './RunbookView.vue'

const attr = (name: string, fallback: string) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (a: Record<string, string>) => ({ [`data-${name}`]: a[name] }),
})

/** Epistemic callouts: /hypothesis, /evidence (verified fact), /contradicts. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({ kind: attr('kind', 'hypothesis') }),
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0],
})

/** /clip: a timestamped media reference with the transcript quote as editable content. */
export const Clip = Node.create({
  name: 'clip',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes: () => ({ url: attr('url', ''), start: attr('start', '0:00'), end: attr('end', '') }),
  parseHTML: () => [{ tag: 'div[data-type="clip"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'clip' }), 0],
  addNodeView: () => VueNodeViewRenderer(ClipView),
})

/** /runbook: a command/SQL/HTTP snippet with a status badge. */
export const Runbook = Node.create({
  name: 'runbook',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  addAttributes: () => ({ lang: attr('lang', 'cmd'), status: attr('status', 'untested') }),
  parseHTML: () => [{ tag: 'div[data-type="runbook"]', preserveWhitespace: 'full' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'runbook' }), ['pre', ['code', 0]]],
  addNodeView: () => VueNodeViewRenderer(RunbookView),
})

/** "14:22" / "1:02:03" → seconds; null if malformed. */
export function toSeconds(t: string): number | null {
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t.trim())) return null
  return t.trim().split(':').reduce((acc, n) => acc * 60 + Number(n), 0)
}

/** Parse "https://… 14:22-15:08" (end optional). Only http(s) links are accepted. */
export function parseClip(input: string): { url: string; start: string; end: string } | null {
  const m = input.trim().match(/^(https?:\/\/\S+)\s+(\d+(?::\d{1,2}){0,2})(?:\s*[-–]\s*(\d+(?::\d{1,2}){0,2}))?$/i)
  return m ? { url: m[1], start: m[2], end: m[3] ?? '' } : null
}

/** Link that starts playback at `start` (YouTube/Vimeo style `t=` param). */
export function clipHref(url: string, start: string): string | undefined {
  if (!/^https?:\/\//i.test(url)) return undefined
  const s = toSeconds(start)
  if (s === null) return url
  const u = new URL(url)
  u.searchParams.set('t', `${s}s`)
  return u.toString()
}
