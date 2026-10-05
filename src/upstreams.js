import { config } from './config.js'
import { fetchWithTimeout, HttpError, positiveInteger } from './http.js'
import { filterByScore } from './ratings.js'

export const userAgent = 'r34-viewer/0.1 (+self-hosted backend)'

async function expectOk(response) {
  if (!response.ok) {
    const message = (await response.text()).slice(0, 300)
    throw new HttpError(502, `Upstream returned HTTP ${response.status}`, message)
  }
  return response
}

function normalizePost(post) {
  const fileUrl = String(post.file_url || '')
  return {
    id: Number(post.id),
    previewUrl: post.preview_url || '',
    sampleUrl: post.sample_url || fileUrl,
    fileUrl,
    width: Number(post.width || 0),
    height: Number(post.height || 0),
    sampleWidth: Number(post.sample_width || 0),
    sampleHeight: Number(post.sample_height || 0),
    score: Number.isFinite(Number(post.score)) ? Number(post.score) : null,
    rating: post.rating || 'unknown',
    tags: String(post.tags || '').split(/\s+/).filter(Boolean),
    source: post.source || '',
    commentCount: Number(post.comment_count || 0),
    downloadUrl: `/api/download?url=${encodeURIComponent(fileUrl)}`,
    type: /\.(webm|mp4)(?:$|\?)/i.test(fileUrl) ? 'video' : /\.gif(?:$|\?)/i.test(fileUrl) ? 'gif' : 'image',
  }
}

function serializeTags(value) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean)
    .map((tag) => tag.replaceAll(' ', '_').toLowerCase()).join(' ')
}

function directApiUrl(pathParams) {
  const url = new URL('https://api.rule34.xxx/index.php')
  for (const [key, value] of Object.entries(pathParams)) url.searchParams.set(key, value)
  if (config.apiKey && config.userId) {
    url.searchParams.set('api_key', config.apiKey)
    url.searchParams.set('user_id', config.userId)
  }
  return url
}

export async function getPosts(searchParams) {
  const limit = positiveInteger(searchParams.get('limit'), 40, 100)
  const page = positiveInteger(searchParams.get('page'), 0, 10_000)
  const tags = serializeTags((searchParams.get('tags') || '').trim().slice(0, 500))
  const minLikes = searchParams.has('minLikes') && searchParams.get('minLikes') !== ''
    ? positiveInteger(searchParams.get('minLikes'), 0, 1_000_000)
    : null
  const sortByScore = searchParams.get('sort') === 'fav'
  const queryTags = [tags, minLikes === null ? '' : `score:>${minLikes}`, sortByScore ? 'sort:score:desc' : '']
    .filter(Boolean).join(' ')
  const proxy = new URL('/posts', config.proxyUrl)
  proxy.searchParams.set('limit', String(limit))
  proxy.searchParams.set('pid', String(page))
  if (queryTags) proxy.searchParams.set('tags', queryTags)

  const hasDirectCredentials = Boolean(config.apiKey && config.userId)
  let source = hasDirectCredentials ? 'direct' : 'proxy'
  let postsResponse
  try {
    const primary = hasDirectCredentials
      ? directApiUrl({ page: 'dapi', s: 'post', q: 'index', json: '1', limit: String(limit), pid: String(page), tags: queryTags })
      : proxy
    postsResponse = await expectOk(await fetchWithTimeout(primary, { headers: { 'user-agent': userAgent } }, config.timeoutMs))
  } catch (primaryError) {
    if (!hasDirectCredentials) throw primaryError
    source = 'proxy'
    postsResponse = await expectOk(await fetchWithTimeout(proxy, { headers: { 'user-agent': userAgent } }, config.timeoutMs))
  }

  const rawPosts = await postsResponse.json()
  if (!Array.isArray(rawPosts)) throw new HttpError(502, 'Upstream returned an invalid posts payload')
  const validPosts = rawPosts.filter((post) => post?.file_url && post?.change).map(normalizePost)
  return {
    page, limit, source: source === 'proxy' ? 'rule34-public-fallback' : 'rule34-direct',
    capabilities: { scores: true, minLikes: true, popularity: true },
    hasMore: rawPosts.length === limit,
    scanned: rawPosts.length,
    posts: filterByScore(validPosts, minLikes),
  }
}

export async function getTags(searchParams) {
  const query = (searchParams.get('q') || '').trim().replaceAll(' ', '_').slice(0, 120)
  if (!query) return []
  const url = new URL('https://api.rule34.xxx/autocomplete.php')
  url.searchParams.set('q', query)
  const response = await expectOk(await fetchWithTimeout(url, { headers: { 'user-agent': userAgent } }, config.timeoutMs))
  const data = await response.json()
  if (!Array.isArray(data)) throw new HttpError(502, 'Upstream returned invalid tag suggestions')
  return data.slice(0, 30).map((item) => ({ name: item.value, label: item.label }))
}

export async function getComments(searchParams) {
  const postId = positiveInteger(searchParams.get('postId'), -1, Number.MAX_SAFE_INTEGER)
  if (postId < 0) throw new HttpError(400, 'postId must be a positive integer')
  const url = new URL('/comments', config.proxyUrl)
  url.searchParams.set('post_id', String(postId))
  const response = await expectOk(await fetchWithTimeout(url, { headers: { 'user-agent': userAgent } }, config.timeoutMs))
  return { contentType: response.headers.get('content-type') || 'text/xml; charset=utf-8', body: await response.text() }
}

export async function probeUpstreams() {
  const checks = [
    ['posts', new URL('/posts?limit=1&pid=0&tags=landscape', config.proxyUrl)],
    ['tags', new URL('https://api.rule34.xxx/autocomplete.php?q=landscape')],
  ]
  const results = await Promise.all(checks.map(async ([name, url]) => {
    const started = Date.now()
    try {
      const response = await fetchWithTimeout(url, { headers: { 'user-agent': userAgent } }, Math.min(config.timeoutMs, 5_000))
      return { name, ok: response.ok, status: response.status, latencyMs: Date.now() - started }
    } catch (error) {
      return { name, ok: false, error: error.message, latencyMs: Date.now() - started }
    }
  }))
  return results
}

