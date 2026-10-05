import test from 'node:test'
import assert from 'node:assert/strict'
import { safeFilename, validateMediaUrl } from '../src/media.js'

test('accepts the known Rule34 CDN', () => {
  assert.equal(validateMediaUrl('https://api-cdn.rule34.xxx/images/file.jpg').hostname, 'api-cdn.rule34.xxx')
})

test('accepts the dedicated Rule34 video CDN', () => {
  assert.equal(validateMediaUrl('https://api-cdn-mp4.rule34.xxx/images/file.mp4').hostname, 'api-cdn-mp4.rule34.xxx')
})

test('rejects arbitrary and credentialed URLs', () => {
  assert.throws(() => validateMediaUrl('http://127.0.0.1/private'))
  assert.throws(() => validateMediaUrl('https://api-cdn.rule34.xxx@evil.example/file.jpg'))
})

test('sanitizes download filenames', () => {
  assert.equal(safeFilename(new URL('https://api-cdn.rule34.xxx/images/a%20b.jpg'), 'image/jpeg'), 'a_b.jpg')
})

