// Shared helper for adapters that expose numeric scores. Unknown scores are null.
// Apply before pagination when the adapter has a local index, or use upstream filtering.
export function filterByScore(posts, threshold = null) {
  if (threshold === null) return posts
  return posts.filter(post => Number.isFinite(post.score) && post.score > threshold)
}

