import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { HttpError, sendJson } from './http.js'
import { proxyMedia, validateMediaUrl } from './media.js'
import { getComments, getPosts, getTags, probeUpstreams } from './upstreams.js'

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url))
const contentTypes = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }

async function serveStatic(pathname, response) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  const file = normalize(join(publicRoot, relative))
  if (!file.startsWith(publicRoot)) return false
  try {
    const info = await stat(file)
    if (!info.isFile()) return false
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] || 'application/octet-stream', 'content-length': info.size })
    createReadStream(file).pipe(response)
    return true
  } catch { return false }
}

export function createApp() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
      if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed')

      if (url.pathname === '/api/posts') return sendJson(response, 200, await getPosts(url.searchParams))
      if (url.pathname === '/api/tags') return sendJson(response, 200, { tags: await getTags(url.searchParams) })
      if (url.pathname === '/api/comments') {
        const result = await getComments(url.searchParams)
        response.writeHead(200, { 'content-type': result.contentType, 'cache-control': 'private, max-age=60' })
        return response.end(result.body)
      }
      if (url.pathname === '/api/health') {
        const upstreams = await probeUpstreams()
        return sendJson(response, upstreams.every((item) => item.ok) ? 200 : 503, { ok: upstreams.every((item) => item.ok), upstreams })
      }
      if (url.pathname === '/api/media' || url.pathname === '/api/download') {
        const mediaUrl = validateMediaUrl(url.searchParams.get('url') || '')
        return await proxyMedia(request, response, mediaUrl, url.pathname.endsWith('download'))
      }
      if (await serveStatic(url.pathname, response)) return
      sendJson(response, 404, { error: 'Not found' })
    } catch (error) {
      if (response.headersSent) return response.destroy(error)
      const status = error instanceof HttpError ? error.status : 500
      sendJson(response, status, { error: error.message || 'Internal server error', ...(error.details ? { details: error.details } : {}) })
    }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp()
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${config.port} is already in use. Check http://${config.host}:${config.port}/ or set a different PORT.`
      : error.message)
    process.exitCode = 1
  })
  server.listen(config.port, config.host, () => console.log(`Viewer listening on http://${config.host}:${config.port}`))
}

