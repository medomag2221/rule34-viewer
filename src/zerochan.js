import { fetchWithTimeout, HttpError, positiveInteger } from './http.js'

export const userAgent = `Art Gallery - ${process.env.ZEROCHAN_USERNAME || 'anonymous'}`
const cache = new Map()
const pending = new Map()
const tags = new Set()
let requests = []

async function api(path) {
  const key = path
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value
  if (pending.has(key)) return pending.get(key)
  requests = requests.filter(time => time > Date.now() - 60_000)
  if (requests.length >= 50) throw new HttpError(429, 'Лимит Zerochan: повторите через минуту')
  requests.push(Date.now())
  const task = (async () => {
    let url = new URL(`https://www.zerochan.net/${path}`)
    let response
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetchWithTimeout(url, { headers: { 'User-Agent': userAgent }, redirect: 'manual' })
      if (![301,302,307,308].includes(response.status)) break
      const next = new URL(response.headers.get('location'), url)
      if (next.origin !== 'https://www.zerochan.net') throw new HttpError(502, 'Unexpected redirect')
      if (!next.search) next.search = url.search
      await response.body?.cancel()
      url = next
    }
    if (!response.ok) throw new HttpError(502, `Zerochan HTTP ${response.status}`)
    let value
    try { value = await response.json() }
    catch { throw new HttpError(502, 'Zerochan вернул некорректную выдачу. Для популярности выберите период «Недавние» или укажите тег.') }
    if (cache.size >= 300) cache.delete(cache.keys().next().value)
    cache.set(key, { value, expires: Date.now() + 120_000 })
    for (const item of value.items || [value]) for (const tag of item.tags || []) { if (tags.size < 10000) tags.add(tag) }
    return value
  })()
  pending.set(key, task)
  try { return await task } finally { pending.delete(key) }
}

export async function getPosts(params) {
  const page = positiveInteger(params.get('page'), 0, 10000)
  const limit = Math.max(1, positiveInteger(params.get('limit'), 30, 100))
  const query = (params.get('tags') || '').slice(0, 500).split(',').map(t => t.trim()).filter(Boolean)
  const path = query.map(encodeURIComponent).join(',')
  const sort = params.get('sort') === 'fav' ? 'fav' : 'id'
  const period = ['0','1','2'].includes(params.get('period')) ? params.get('period') : '1'
  const minLikes = params.has('minLikes') && params.get('minLikes') !== '' ? positiveInteger(params.get('minLikes'), 0, 1000000) : null
  const queryString = `p=${page + 1}&l=${limit}&s=${sort}${sort === 'fav' ? `&t=${period}` : ''}`
  const data = await api(`${path}?json&${queryString}`)
  if (!Array.isArray(data.items)) throw new HttpError(502, 'Некорректная выдача Zerochan')
  const warning = minLikes !== null ? 'Фильтр лайков сохранён, но не применяется: API Zerochan не отдаёт рейтинг. Для источника с рейтингом фильтр будет доступен.' : 'Zerochan: рейтинг недоступен (—). Сортировка по популярности доступна независимо от счётчика.'
  return { page, limit, source: 'zerochan', capabilities: { scores: false, minLikes: false, popularity: true }, hasMore: data.items.length === limit, scanned: data.items.length, warning, posts: data.items.map(item => ({
    id: item.id, previewUrl: item.thumbnail, sampleUrl: item.thumbnail,
    fileUrl: '', downloadUrl: `/api/original?id=${item.id}`,
    width: item.width, height: item.height, score: null,
    tags: item.tags || [item.tag], source: item.source || '', type: 'image',
  })) }
}

export async function getOriginal(id) {
  if (!/^\d{1,12}$/.test(id || '')) throw new HttpError(400, 'Invalid entry ID')
  const data = await api(`${id}?json`)
  if (!data.full) throw new HttpError(502, 'Оригинал отсутствует')
  return data.full
}

export async function getTags(params) {
  const query = (params.get('q') || '').trim().toLowerCase()
  return query ? [...tags].filter(tag => tag.toLowerCase().includes(query)).slice(0, 30).map(name => ({ name, label: 'Из просмотренных публикаций' })) : []
}
export async function getComments() { return { contentType: 'text/xml', body: '<comments />' } }
export async function probeUpstreams() {
  try { await api('?json&p=1&l=1&s=id'); return [{ name: 'zerochan', ok: true }] }
  catch (error) { return [{ name: 'zerochan', ok: false, error: error.message }] }
}

