export function initFullView(container) {
  const dialog = document.createElement('dialog')
  dialog.className = 'full-view'
  dialog.setAttribute('aria-label', 'Просмотр оригинала')
  dialog.innerHTML = '<div class="full-toolbar"><button type="button" class="full-back">← К галерее</button><button type="button" class="full-zoom">Масштаб 1:1</button><a class="full-download">Скачать</a></div><p class="full-status" role="status"></p><div class="full-stage"><img alt="Оригинал изображения"></div>'
  document.body.append(dialog)
  const image = dialog.querySelector('img'), status = dialog.querySelector('.full-status')
  const zoom = dialog.querySelector('.full-zoom')
  let previousOverflow = '', opener, currentId, currentFile = ''
  function close() {
    if (location.hash.startsWith('#post=')) history.back()
    else dialog.close()
  }
  function sync() {
    const match = location.hash.match(/^#post=(\d{1,12})$/)
    if (!match) { if (dialog.open) dialog.close(); return }
    if (dialog.open && currentId === match[1]) return
    currentId = match[1]
    image.classList.remove('actual-size')
    zoom.textContent = 'Масштаб 1:1'
    status.textContent = 'Загружаем оригинал…'
    image.hidden = true
    image.onload = () => { image.hidden = false; status.textContent = `${image.naturalWidth} × ${image.naturalHeight}` }
    image.onerror = () => { status.textContent = 'Не удалось загрузить оригинал. Вернитесь в галерею и попробуйте ещё раз.' }
    if (!currentFile) { status.textContent = 'Оригинал не найден. Откройте публикацию из галереи.'; return }
    image.src = `api/media?url=${encodeURIComponent(currentFile)}`
    dialog.querySelector('.full-download').href = `api/download?url=${encodeURIComponent(currentFile)}`
    if (!dialog.open) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal() }
  }
  container.addEventListener('click', event => {
    const target = event.target.closest('a.open-full[data-full]')
    if (!target) return
    event.preventDefault(); opener = target; currentFile = target.dataset.file || ''
    history.pushState(null, '', `#post=${target.dataset.full}`); sync()
  })
  dialog.querySelector('.full-back').addEventListener('click', close)
  dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
  dialog.addEventListener('close', () => { image.removeAttribute('src'); document.body.style.overflow = previousOverflow; opener?.focus({ preventScroll: true }) })
  zoom.addEventListener('click', () => { const actual = image.classList.toggle('actual-size'); zoom.textContent = actual ? 'Вписать в экран' : 'Масштаб 1:1' })
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
  // Reloaded full-view URL should still have a reliable return route.
  if (/^#post=/.test(location.hash)) { const hash = location.hash; history.replaceState(null, '', location.pathname + location.search); history.pushState(null, '', hash) }
  sync()
}

