import { FileIcon, FileText, Film, Image, Music, type LucideIcon } from '@lucide/vue'
import { ApiError } from './api'

/** What the server returns for an upload, and in /v1/files. */
export type FileInfo = { id: string; name: string; mime: string; size: number; url: string; created_at: string }
export type StoredFile = FileInfo & { notes: { id: string; title: string }[]; hidden_notes: number }
export type Storage = { used: number; quota: number; files: StoredFile[] }

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'file'

const TEXT = /\.(txt|md|markdown|csv|tsv|json|ya?ml|toml|xml|log|ini|env|sql|py|js|ts|rs|go|java|c|h|cpp|sh|html|css)$/i
const MB = 1024 * 1024

/** How a file shows in a note. The server's sniffed mime decides media; the name only marks text we can read. */
export function fileKind(mime: string, name: string): FileKind {
  if (mime === 'application/pdf') return 'pdf'
  const top = mime.split('/')[0]
  if (top === 'image' || top === 'video' || top === 'audio') return top
  return TEXT.test(name) ? 'text' : 'file'
}

/** Same per-file limits as the server (files.rs `limit`); checked here only to fail fast before uploading. */
export function fileLimit(type: string, name: string): number {
  if (type.startsWith('video/')) return 100 * MB
  if (type.startsWith('image/') || type.startsWith('audio/')) return 10 * MB
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 15 * MB
  return 5 * MB
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`
}

/** Uploads one file (to a note when `doc` is set). XHR rather than fetch, for upload progress on big videos. */
export function uploadFile(file: File, o: { doc?: string; onProgress?: (fraction: number) => void } = {}): Promise<FileInfo> {
  const limit = fileLimit(file.type, file.name)
  if (file.size > limit) return Promise.reject(new ApiError(413, `${file.name} is ${formatSize(file.size)}; files like this can be at most ${formatSize(limit)}`))
  const q = new URLSearchParams({ name: file.name })
  if (o.doc) q.set('doc', o.doc)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/v1/files?${q}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && o.onProgress?.(e.loaded / e.total)
    xhr.onload = () => (xhr.status === 201 ? resolve(JSON.parse(xhr.responseText)) : reject(new ApiError(xhr.status, xhr.responseText || xhr.statusText)))
    xhr.onerror = () => reject(new ApiError(0, `Couldn't upload ${file.name}: the connection dropped`))
    xhr.send(file)
  })
}

/** Accept filters for the file picker, per slash command. */
export const ACCEPT: Record<string, string> = { image: 'image/*', video: 'video/*', audio: 'audio/*', pdf: 'application/pdf,.pdf', file: '' }

export const KIND_ICON: Record<FileKind, LucideIcon> = { image: Image, video: Film, audio: Music, pdf: FileText, text: FileText, file: FileIcon }

/** Files dropped or pasted into a note, keyed by the `upload` attr of the block that uploads them. Local to this tab. */
export const pendingUploads = new Map<string, File>()

/** CSV/TSV rows (RFC 4180 quoting: "a, b" and "" for a quote). Blank lines are skipped. */
export function parseCsv(text: string, delim = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}
