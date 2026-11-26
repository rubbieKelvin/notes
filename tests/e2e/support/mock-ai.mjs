// Fake AI provider speaking both Anthropic Messages and OpenAI Chat Completions. Records requests at GET /__requests.
import http from 'node:http'

export const GOOD_KEY = 'sk-good-key-123456'
const port = Number(process.env.MOCK_AI_PORT ?? 19999)
const requests = []

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    const path = req.url.split('?')[0]
    if (path === '/__health') return send(res, 200, { ok: true })
    if (path === '/__requests') return send(res, 200, requests)
    const anthropic = 'x-api-key' in req.headers
    const key = anthropic ? req.headers['x-api-key'] : (req.headers.authorization ?? '').replace(/^Bearer /, '')
    const body = raw ? JSON.parse(raw) : null
    requests.push({ method: req.method, path, anthropic, headers: { 'anthropic-version': req.headers['anthropic-version'], 'anthropic-beta': req.headers['anthropic-beta'] }, body })
    if (key !== GOOD_KEY) return send(res, 401, { error: { message: 'invalid api key' } })

    const hasImage = JSON.stringify(body ?? {}).includes('base64')
    const note = hasImage ? 'Looks like an equation: A = 6s² is a cube’s surface area.' : 'For a cube, height = width = breadth = s, so V = s³.'
    if (req.method === 'GET' && path === '/v1/models') {
      return send(res, 200, { data: (anthropic ? ['claude-opus-5-5', 'claude-sonnet-5-5'] : ['mock-model', 'mock-vision']).map((id) => ({ id })) })
    }
    if (req.method === 'POST' && path === '/v1/messages') {
      return send(res, 200, { model: body.model, stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: note }] })
    }
    if (req.method === 'POST' && path === '/v1/chat/completions') {
      return send(res, 200, { model: body.model, choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: note, refusal: null } }] })
    }
    send(res, 404, { error: { message: `mock: no route ${req.method} ${path}` } })
  })
}).listen(port, '127.0.0.1', () => console.log(`mock AI on http://127.0.0.1:${port}`))
