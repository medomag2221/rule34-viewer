import test from 'node:test'
import assert from 'node:assert/strict'
import { filterByScore } from '../src/ratings.js'

test('rating filter for future adapters is strictly greater; unknown is not zero', () => {
  const posts = [{score: null}, {score: 0}, {score: 10}, {score: 11}]
  assert.deepEqual(filterByScore(posts, 10), [{score: 11}])
  assert.deepEqual(filterByScore(posts, null), posts)
})

