import type { App } from 'vue'

// Self-hosted telemetry: events go to our own server's `events` table, never note content.
// Plain fetch, not api(): a 401 here (signed out) must not trigger the signed-out flow, and failures are ignored.
export function track(name: 'sheet_ready' | 'canvas_expand' | 'client_error', props: Record<string, unknown> = {}, docId?: string) {
  fetch('/v1/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, doc_id: docId, props }),
    keepalive: true,
  }).catch(() => {})
}

// PRD §7 Time-to-First-Word: from navigation start to an editable, synced sheet; first sheet of the page load only.
let readySent = false
export function sheetReady(docId: string) {
  if (readySent) return
  readySent = true
  track('sheet_ready', { ms: Math.round(performance.now()) }, docId)
}

const seen = new Set<string>()
function reportError(e: unknown, source: string) {
  const message = (e instanceof Error ? e.message : String(e)).slice(0, 500)
  // one report per distinct message, at most 20 per page load, so an error in a loop can't flood the table
  if (seen.has(message) || seen.size >= 20) return
  seen.add(message)
  track('client_error', { message, source, stack: e instanceof Error ? e.stack?.slice(0, 2000) : undefined, path: location.pathname })
}

export function installErrorReporting(app: App) {
  app.config.errorHandler = (e, _instance, info) => {
    console.error(e)
    reportError(e, `vue: ${info}`)
  }
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'))
}
