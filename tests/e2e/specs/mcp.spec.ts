import { createToken, expect, setNoteDetails, openEditor, selectText, test, typeInEditor, useMockProvider } from '../support/fixtures'

/** Minimal MCP Streamable HTTP client. */
function mcpClient(base: string, token: string) {
  let session: string | null = null
  let id = 0
  const headers = () => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}) })
  async function rpc(method: string, params: object = {}) {
    const res = await fetch(`${base}/mcp`, { method: 'POST', headers: headers(), body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) })
    session ??= res.headers.get('mcp-session-id')
    const text = await res.text()
    const data = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).find((l) => l.startsWith('{'))
    return { status: res.status, json: data ? JSON.parse(data) : null }
  }
  return {
    rpc,
    async init() {
      const r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } })
      await fetch(`${base}/mcp`, { method: 'POST', headers: headers(), body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) })
      return r
    },
    async call(name: string, args: object = {}) {
      return (await rpc('tools/call', { name, arguments: args })).json?.result?.content?.[0]?.text as string
    },
  }
}

test('MCP requires a token with the mcp scope', async ({ page, user: _ }) => {
  const origin = test.info().project.use.baseURL!
  expect((await fetch(`${origin}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(401)
  const ingestOnly = await createToken(page.request, ['ingest'])
  expect((await mcpClient(origin, ingestOnly).init()).status).toBe(403)
})

test('agents read exposed pages (with margin notes) and push to the inbox', async ({ page, user: _ }) => {
  const origin = test.info().project.use.baseURL!
  await useMockProvider(page.request)
  const docId = await openEditor(page)
  await setNoteDetails(page, 'Box Geometry')
  await typeInEditor(page, 'Boxes share a height.')
  await selectText(page, 'height')
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('complementary')).toContainText('V = s³')

  const mcp = mcpClient(origin, await createToken(page.request, ['mcp']))
  expect((await mcp.init()).status).toBe(200)
  const tools = (await mcp.rpc('tools/list')).json.result.tools.map((t: { name: string }) => t.name)
  expect(tools.sort()).toEqual(['list_documents', 'push_note', 'read_document'])
  expect(await mcp.call('list_documents')).toContain('No documents are exposed')

  await page.getByRole('button', { name: /^MCP/ }).click()
  await page.getByText('Let my agents read this page').click()
  await expect(page.getByRole('dialog', { name: 'Agent access' })).toContainText('Add the server to your agent')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'MCP: Live' })).toBeVisible()
  const slug = (await (await page.request.get('/v1/docs')).json()).find((d: { id: string }) => d.id === docId).mcp_exposed_slug
  await page.waitForTimeout(2500) // text cache is written with the next persist

  expect(await mcp.call('list_documents')).toContain(`${slug}\tBox Geometry`)
  const text = await mcp.call('read_document', { slug })
  expect(text).toContain('# Box Geometry')
  expect(text).toContain('Boxes share a height [AI margin note: For a cube')
  expect(await mcp.call('read_document', { slug: 'doc-not-mine' })).toBeUndefined()

  await mcp.call('push_note', { content_md: 'Consider tesseracts.', title: 'From agent' })
  await page.reload()
  await expect(page.getByRole('button', { name: '1 AI' })).toBeVisible()
})
