import { createApp, h } from 'vue'
import { pageBounds, union, type Shapes } from './geometry'
import ShapeView from './ShapeView.vue'
import type { Shape } from './types'

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b) })
const fetchDataUrl = async (url: string) => blobToDataUrl(await (await fetch(url)).blob())

let fontCss: Promise<string> | undefined
/** KaTeX and Inter rules from this page with their fonts inlined: an SVG drawn as an image can't load anything. */
function pageFonts() {
  return (fontCss ??= (async () => {
    const parts: Promise<string>[] = []
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList
      try { rules = sheet.cssRules } catch { continue } // cross-origin sheet
      for (const r of rules) {
        if (r instanceof CSSFontFaceRule && /katex|inter/i.test(r.style.getPropertyValue('font-family'))) {
          const base = sheet.href ?? location.href
          const urls = [...r.cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1])
          parts.push(Promise.all(urls.map((u) => fetchDataUrl(new URL(u, base).href).catch(() => u)))
            .then((data) => urls.reduce((css, u, i) => css.replace(u, data[i]), r.cssText)))
        } else if (r instanceof CSSStyleRule && r.selectorText.includes('katex')) parts.push(Promise.resolve(r.cssText))
      }
    }
    return (await Promise.all(parts)).join('\n')
  })())
}

/** A standalone SVG of `list` (or nothing when empty), cropped to their bounds plus padding. */
export async function toSvg(list: Shape[], shapes: Shapes, opts: { padding?: number; background?: boolean } = {}) {
  const b = union(list.map((s) => pageBounds(s, shapes)))
  if (!b) return null
  const pad = opts.padding ?? 16, w = Math.ceil(b.w + pad * 2), hgt = Math.ceil(b.h + pad * 2)
  const host = document.createElement('div')
  const app = createApp({
    render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: hgt, viewBox: `${b.x - pad} ${b.y - pad} ${w} ${hgt}` }, [
      opts.background ? h('rect', { x: b.x - pad, y: b.y - pad, width: w, height: hgt, fill: '#ffffff' }) : null,
      ...list.map((s) => h(ShapeView, { shape: s, shapes })),
    ]),
  })
  app.mount(host)
  const svg = host.querySelector('svg')!
  for (const img of svg.querySelectorAll('image')) {
    const href = img.getAttribute('href')
    if (href && !href.startsWith('data:')) img.setAttribute('href', await fetchDataUrl(href).catch(() => href))
  }
  const needsFonts = list.some((s) => s.type === 'math' || s.type === 'text' || s.type === 'note' || s.type === 'frame')
  if (needsFonts) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = await pageFonts()
    svg.prepend(style)
  }
  const out = new XMLSerializer().serializeToString(svg)
  app.unmount()
  return { svg: out, w, h: hgt, bounds: b }
}

/** Rasterize an SVG string to a data URL. */
export async function rasterize(svg: string, w: number, h: number, opts: { scale?: number; type?: 'image/png' | 'image/jpeg'; quality?: number } = {}) {
  const scale = opts.scale ?? 2
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  const ctx = c.getContext('2d')!
  if (opts.type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height) }
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL(opts.type ?? 'image/png', opts.quality)
}

export function download(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}
