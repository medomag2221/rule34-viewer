// Keep DOM order chronological while packing cards into the shortest column.
export function masonry(container) {
  let frame
  function layout() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const cards = [...container.children]
      const width = container.clientWidth
      const columns = window.innerWidth <= 760 ? 1 : width < 900 ? 2 : width < 1200 ? 3 : 4
      const gap = 14
      const columnWidth = (width - gap * (columns - 1)) / columns
      const heights = Array(columns).fill(0)
      for (const card of cards) {
        if (card.tagName !== 'ARTICLE') {
          card.style.position = 'static'
          container.style.height = 'auto'
          return
        }
        card.style.width = `${columnWidth}px`
        const column = heights.indexOf(Math.min(...heights))
        card.style.position = 'absolute'
        card.style.left = `${column * (columnWidth + gap)}px`
        card.style.top = `${heights[column]}px`
        heights[column] += card.offsetHeight + gap
      }
      container.style.height = `${Math.max(0, ...heights) - (cards.length ? gap : 0)}px`
    })
  }
  const observer = new ResizeObserver(layout)
  observer.observe(container)
  const watch = () => {
    observer.disconnect(); observer.observe(container)
    for (const card of container.children) observer.observe(card)
    layout()
  }
  new MutationObserver(watch).observe(container, { childList: true })
  window.addEventListener('resize', layout)
  container.addEventListener('load', layout, true)
  watch()
}

