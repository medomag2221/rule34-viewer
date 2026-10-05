export function toggleTag(tags, value, exclude = false) {
  const name = value.replace(/^-/, '').trim()
  const index = tags.findIndex(tag => tag.replace(/^-/, '').toLowerCase() === name.toLowerCase())
  if (!name) return tags
  if (exclude && index >= 0) return tags.map((tag, current) => current === index ? (tag.startsWith('-') ? name : `-${name}`) : tag)
  if (exclude) return [...tags, `-${name}`]
  return index >= 0 ? tags.filter((_, current) => current !== index) : [...tags, value]
}

export function tagGestures(root, selector, act) {
  let timer, held = false, origin
  function cancel() { clearTimeout(timer) }
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    const button = event.target.closest(selector)
    if (!button) return
    held = false; origin = [event.clientX, event.clientY]
    timer = setTimeout(() => { held = true; act(button, true) }, 500)
  })
  root.addEventListener('pointermove', event => {
    if (origin && Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 10) cancel()
  })
  for (const type of ['pointerup','pointercancel','pointerleave']) root.addEventListener(type, cancel)
  root.addEventListener('click', event => {
    const button = event.target.closest(selector)
    if (!button) return
    event.preventDefault()
    if (held) { held = false; return }
    act(button, event.shiftKey)
  })
  root.addEventListener('contextmenu', event => {
    const button = event.target.closest(selector)
    if (!button) return
    event.preventDefault(); cancel()
    if (!held) act(button, true)
  })
}

export function createTagChips(input, onChange) {
  const box = document.createElement('div')
  box.className = 'active-tags'
  box.setAttribute('aria-label', 'Выбранные теги')
  input.closest('form').after(box)
  function values() { return input.value.split(',').map(tag => tag.trim()).filter(Boolean) }
  function render() {
    box.replaceChildren()
    for (const tag of values()) {
      const button = document.createElement('button')
      button.type = 'button'; button.dataset.chip = tag
      button.className = tag.startsWith('-') ? 'excluded' : 'included'
      button.textContent = `${tag} ×`
      button.title = 'Нажать: убрать · Удержать / правая кнопка / Shift+Enter: исключить'
      box.append(button)
    }
    box.hidden = !box.children.length
  }
  tagGestures(box, '[data-chip]', (button, exclude) => {
    input.value = toggleTag(values(), button.dataset.chip, exclude).join(', ')
    render(); onChange()
  })
  input.addEventListener('input', render)
  input.form?.addEventListener('reset', () => queueMicrotask(render))
  input.addEventListener('tag-selected', () => { render(); onChange() })
  render()
  return render
}

