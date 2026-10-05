const CACHE = 'r34-shell-v16'
const FILES = ['./', 'styles.css', 'gallery.css', 'app.js', 'cards.js', 'model.js', 'autocomplete.js', 'tag-chips.js', 'masonry.js', 'full-view.js', 'pwa.js', 'icon.svg', 'manifest.webmanifest']
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href)))) })
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => /^(zerochan|r34)-shell-/.test(key) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))) }
    return response
  }).catch(() => caches.match(event.request)))
})

