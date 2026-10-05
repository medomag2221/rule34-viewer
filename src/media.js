import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { userAgent } from './upstreams.js'
import { config } from './config.js'
import { fetchWithTimeout, HttpError } from './http.js'

const ALLOWED_MEDIA_HOSTS = new Set(['api-cdn.rule34.xxx', 'api-cdn-mp4.rule34.xxx', 'rule34.xxx', 'www.rule34.xxx'])
const PASSTHROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']

export function validateMediaUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new HttpError(400, 'Invalid media URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !ALLOWED_MEDIA_HOSTS.has(url.hostname)) {
    throw new HttpError(400, 'Media host is not allowed')
  }
  return url
}

export function safeFilename(url, contentType) {
  const raw = decodeURIComponent(url.pathname.split('/').pop() || 'download')
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180)
  if (cleaned.includes('.')) return cleaned
  const extension = contentType?.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'bin'
  return `${cleaned || 'download'}.${extension}`
}

export async function proxyMedia(request, response, url, download) {
  const headers = { 'user-agent': userAgent, 'accept-encoding': 'identity' }
  if (request.headers.range) headers.range = request.headers.range
  const target = new URL(url)
  const upstream = await fetchWithTimeout(target, { headers, redirect: 'manual' }, config.timeoutMs)
  if (![200, 206].includes(upstream.status) || !upstream.body) throw new HttpError(502, `Media upstream returned HTTP ${upstream.status}`)

  const outgoing = { 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' }
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) outgoing[name] = value
  }
  if (download) outgoing['content-disposition'] = `attachment; filename="${safeFilename(url, outgoing['content-type'])}"`
  response.writeHead(upstream.status, outgoing)
  const stream = Readable.fromWeb(upstream.body)
  const stop = () => stream.destroy()
  response.once('close', stop)
  try { await pipeline(stream, response) } finally { response.off('close', stop) }
}

