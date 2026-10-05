import test from 'node:test'
import assert from 'node:assert/strict'
import { getPosts } from '../src/upstreams.js'

test('Rule34 requests preserve tag modifiers and apply score filtering', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url)
    return new Response(JSON.stringify([
      { id: 1, change: 1, file_url: 'https://api-cdn.rule34.xxx/images/a.jpg', score: 10, tags: 'first_tag' },
      { id: 2, change: 1, file_url: 'https://api-cdn.rule34.xxx/images/b.jpg', score: 11, tags: 'second_tag' },
    ]))
  }
  try {
    const result = await getPosts(new URLSearchParams({ tags: 'Blue Eyes, -green hair', minLikes: '10', sort: 'fav', limit: '2' }))
    assert.equal(requestedUrl.pathname, '/posts')
    assert.equal(requestedUrl.searchParams.get('tags'), 'blue_eyes -green_hair score:>10 sort:score:desc')
    assert.deepEqual(result.posts.map((post) => post.id), [2])
    assert.equal(result.posts[0].downloadUrl, '/api/download?url=https%3A%2F%2Fapi-cdn.rule34.xxx%2Fimages%2Fb.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

