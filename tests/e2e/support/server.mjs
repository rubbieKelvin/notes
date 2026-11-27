// Starts the Rust server for e2e runs. Uses E2E_DATABASE_URL if set, otherwise a throwaway Postgres cluster.
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../../..', import.meta.url))
const pgDir = join(tmpdir(), 'opennotes-e2e-pg')
// e2e email: the server's `fs` driver writes every message here as JSON; the fixtures read them.
export const mailDir = join(tmpdir(), 'opennotes-e2e-mail')
let ownPg = false

function stopPg() {
  if (!existsSync(pgDir)) return
  try { execFileSync('pg_ctl', ['-D', pgDir, 'stop', '-m', 'immediate'], { stdio: 'ignore' }) } catch { /* not running */ }
}

let dbUrl = process.env.E2E_DATABASE_URL
if (!dbUrl) {
  const port = process.env.E2E_PG_PORT ?? '15544'
  stopPg() // a previous run may have been killed before cleaning up
  rmSync(pgDir, { recursive: true, force: true })
  try {
    execFileSync('initdb', ['-D', pgDir, '-U', 'opennotes', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' })
    // TCP only: macOS temp paths are too long for Postgres unix sockets.
    execFileSync('pg_ctl', ['-D', pgDir, '-o', `-p ${port} -k ''`, '-l', join(pgDir, 'log'), '-w', 'start'], { stdio: 'ignore' })
  } catch (e) {
    console.error('e2e: could not start a throwaway Postgres (needs initdb/pg_ctl on PATH). Set E2E_DATABASE_URL to an empty database instead.\n', e.message)
    process.exit(1)
  }
  ownPg = true
  dbUrl = `postgres://opennotes@127.0.0.1:${port}/postgres`
}

rmSync(mailDir, { recursive: true, force: true })
mkdirSync(mailDir, { recursive: true })

const server = spawn('cargo', ['run', '--quiet', '--manifest-path', join(repo, 'server/Cargo.toml'), '--bin', 'server'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DATABASE_URL: dbUrl,
    OPENNOTES_SECRET: randomBytes(32).toString('base64'),
    BIND: `127.0.0.1:${process.env.E2E_API_PORT ?? 18080}`,
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${process.env.MOCK_AI_PORT ?? 19999}`,
    ALLOW_PRIVATE_AI_URLS: 'true', // the mock provider lives on localhost
    COOKIE_SECURE: 'false',
    PUBLIC_URL: `http://localhost:${process.env.E2E_WEB_PORT ?? 14173}`,
    EMAIL_DRIVER: 'fs',
    EMAIL_FS_DIR: mailDir,
    FILES_DIR: join(tmpdir(), 'opennotes-e2e-files'),
  },
})
server.stdout.on('data', (chunk) => process.stdout.write(chunk))

const shutdown = () => {
  server.kill('SIGTERM')
  if (ownPg) stopPg()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
server.on('exit', (code) => {
  if (ownPg) stopPg()
  process.exit(code ?? 1)
})
