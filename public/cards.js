export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export const icon = (name) =>
  ({
    heart:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    download:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7V5Z"/></svg>',
    pause:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 13 20 4 11V4h7l9 9ZM8 8h.01"/></svg>',
  })[name];
function safeUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
function media(post) {
  const preview = escapeHtml(
    safeUrl(`api/media?url=${encodeURIComponent(post.sampleUrl || post.fileUrl || "")}`),
  );
  const playback = escapeHtml(
    safeUrl(`api/media?url=${encodeURIComponent(post.fileUrl || post.sampleUrl || "")}`),
  );
  const download = escapeHtml(
    safeUrl(`api/download?url=${encodeURIComponent(post.fileUrl || post.sampleUrl || "")}`),
  );
  const ratio = post.width && post.height ? post.width / post.height : 1;
  const shape = ratio > 1.45 ? "wide" : ratio < 0.72 ? "tall" : "square";
  const content =
    post.type === "video"
      ? `<div class="post-media video-player"><video preload="metadata" playsinline poster="${preview}" src="${playback}"></video><button class="video-toggle" type="button" data-video-toggle aria-label="Воспроизвести" title="Воспроизвести">${icon("play")}</button></div>`
      : `<div class="post-media image-player" role="button" tabindex="0" aria-label="Показать теги работы" aria-expanded="false"><img loading="lazy" width="${Number(post.width) || 1}" height="${Number(post.height) || 1}" src="${preview}" alt="${escapeHtml(post.tags.slice(0, 5).join(", "))}"></div>`;
  return { content, shape, playback, download };
}
export function card(post) {
  post = {
    ...post,
    tags: Array.isArray(post.tags)
      ? post.tags.filter((tag) => typeof tag === "string")
      : [],
  };
  const { content, shape, playback, download } = media(post);
  const tags = post.tags
    .map(
      (tag) =>
        `<button type="button" data-tag="${encodeURIComponent(tag)}" title="Нажать: добавить/убрать · Удержать: исключить"><span class="tag-sign">${icon("plus")}</span>${escapeHtml(tag)}</button>`,
    )
    .join("");
  return `<article class="${shape}"><div class="post-visual">${content}<div class="post-actions"><span class="post-score" title="Рейтинг Rule34">${icon("heart")}<b>${Number.isFinite(post.score) ? post.score : "—"}</b></span><a href="${playback}" target="_blank" rel="noopener" title="Открыть оригинал в новой вкладке" aria-label="Открыть оригинал в новой вкладке">${icon("external")}</a><a href="${download}" title="Скачать оригинал" aria-label="Скачать оригинал">${icon("download")}</a></div></div><div class="post-tags"><div class="tag-panel-heading">Теги работы <small>Нажать: выбрать · Удержать: исключить</small></div>${tags}</div></article>`;
}

