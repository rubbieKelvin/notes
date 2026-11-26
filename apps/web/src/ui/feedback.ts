import katex from 'katex'
import { reactive } from 'vue'
import { toast as sonner } from 'vue-sonner'

/** In-app replacements for alert/confirm/prompt. Dialogs render in FeedbackHost.vue, toasts via vue-sonner. */
export type DialogRequest = {
  title: string
  body?: string
  /** Present for prompts: the text field's label and starting value. */
  input?: { label: string; value: string; placeholder?: string; multiline?: boolean; validate?: (v: string) => string | null; preview?: (v: string) => string }
  confirmLabel?: string
  danger?: boolean
  resolve: (v: string | boolean | null) => void
}

export const feedback = reactive({ dialog: null as DialogRequest | null })

function open<T>(req: Omit<DialogRequest, 'resolve'>) {
  feedback.dialog?.resolve(null) // only one at a time; a newer request cancels the older one
  return new Promise<T>((resolve) => (feedback.dialog = { ...req, resolve: resolve as DialogRequest['resolve'] }))
}

export const confirmDialog = (req: { title: string; body?: string; confirmLabel?: string; danger?: boolean }) =>
  open<boolean | null>(req).then((v) => v === true)

/** Resolves to the entered text, or null when cancelled. */
export const promptDialog = (req: { title: string; body?: string; confirmLabel?: string } & NonNullable<DialogRequest['input']>) => {
  const { title, body, confirmLabel, ...input } = req
  return open<string | null>({ title, body, confirmLabel, input })
}

export const toast = (text: string, kind: 'info' | 'error' = 'info') => (kind === 'error' ? sonner.error(text) : sonner.success(text))

export const askLatex = (value = '') =>
  promptDialog({ title: 'Equation', label: 'LaTeX', value, placeholder: 'E = mc^2', multiline: true,
    // KaTeX escapes input and, with trust off (default), emits no links or scripts.
    preview: (v) => katex.renderToString(v, { throwOnError: false, displayMode: true }),
    confirmLabel: value ? 'Update' : 'Insert' })
