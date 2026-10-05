import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleTag } from '../public/tag-chips.js'

test('click adds and removes a tag without changing other tags', () => {
  assert.deepEqual(toggleTag(['Landscape'], 'Blue Eyes'), ['Landscape', 'Blue Eyes'])
  assert.deepEqual(toggleTag(['Landscape', 'Blue Eyes'], 'blue eyes'), ['Landscape'])
})

test('exclusion switches between negative and positive, without duplicates', () => {
  assert.deepEqual(toggleTag(['Landscape', 'Blue Eyes'], 'Blue Eyes', true), ['Landscape', '-Blue Eyes'])
  assert.deepEqual(toggleTag(['Landscape', '-Blue Eyes'], 'Blue Eyes', true), ['Landscape', 'Blue Eyes'])
  assert.deepEqual(toggleTag([], 'Blue Eyes', true), ['-Blue Eyes'])
})

test('reversing a super-tag keeps its place among selected tags', () => {
  const tags = ['landscape', '@super:no-ai-and-shock', 'blue_eyes']
  assert.deepEqual(toggleTag(tags, '@super:no-ai-and-shock', true), ['landscape', '-@super:no-ai-and-shock', 'blue_eyes'])
  assert.deepEqual(toggleTag(['landscape', '-@super:no-ai-and-shock', 'blue_eyes'], '@super:no-ai-and-shock', true), tags)
})

