import { card, icon, escapeHtml } from "./cards.js";
import "./pwa.js";
import {
  normalizeTags,
  splitTags as parseTags,
  pageSize,
  readObject,
  normalizeCollections,
  saveCollection,
} from "./model.js";
import { tagGestures, toggleTag } from "./tag-chips.js";
import { masonry } from "./masonry.js";
import { attachAutocomplete } from "./autocomplete.js";
const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#search"),
  input: $("#tags"),
  results: $("#results"),
  suggestions: $("#suggestions"),
  loading: $("#loading"),
  prev: $("#prev"),
  next: $("#next"),
  page: $("#page-number"),
  pageLabel: $("#page-label"),
  pageSize: $("#page-size"),
  settings: $("#settings"),
  settingsSupertags: $("#settings-supertags"),
  status: $("#status"),
};
const savedState = readObject(
  localStorage,
  "r34-viewer-preferences",
  "r34-viewer",
);
const tabState = readObject(sessionStorage, "r34-viewer-tab");
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let anonymousUser = readObject(localStorage, "r34-viewer-anonymous-user");
if (!anonymousUser.id) {
  anonymousUser = {
    id: makeId(),
    type: "anonymous",
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      "r34-viewer-anonymous-user",
      JSON.stringify(anonymousUser),
    );
  } catch {}
}
masonry(elements.results);
const normalizedSupertags = normalizeCollections(
  savedState.supertags,
  anonymousUser.id,
);
const superToken = (id) => `@super:${id}`;
const superByToken = (token) =>
  token.replace(/^-/, "").startsWith("@super:")
    ? state.supertags.find(
        (item) => item.id === token.replace(/^-/, "").slice(7),
      )
    : null;
const defaultTokens = normalizedSupertags
  .filter((item) => item.default)
  .map((item) => superToken(item.id));
const initialTags =
  typeof tabState.tags === "string" ? tabState.tags : defaultTokens.join(", ");
const state = {
  appliedTags:
    typeof tabState.appliedTags === "string"
      ? tabState.appliedTags
      : initialTags,
  page:
    Number.isInteger(tabState.page) && tabState.page >= 0
      ? Math.min(tabState.page, 10000)
      : 0,
  pageSize: pageSize(savedState.pageSize),
  tags: initialTags,
  savedTags: Array.isArray(savedState.savedTags) ? savedState.savedTags : [],
  supertags: normalizedSupertags,
  request: null,
};
function persist() {
  try {
    sessionStorage.setItem(
      "r34-viewer-tab",
      JSON.stringify({
        page: state.page,
        appliedTags: state.appliedTags,
        tags: state.tags,
      }),
    );
    localStorage.setItem(
      "r34-viewer-preferences",
      JSON.stringify({
        pageSize: state.pageSize,
        savedTags: state.savedTags,
        supertags: state.supertags,
      }),
    );
  } catch {
    elements.status.textContent = "Браузер не разрешает сохранить настройки";
  }
}
function splitTags(value = state.tags) {
  return parseTags(value);
}
function invertTag(tag) {
  return tag.startsWith("-") ? tag.slice(1) : `-${tag}`;
}
function resolveTags(value = state.appliedTags) {
  return normalizeTags(
    splitTags(value).flatMap((tag) => {
      const supertag = superByToken(tag);
      return supertag
        ? tag.startsWith("-")
          ? supertag.tags.map(invertTag)
          : supertag.tags
        : tag.replace(/^-/, "").startsWith("@super:")
          ? []
          : [tag];
    }),
  );
}
function setTags(tags, load = true) {
  state.tags = normalizeTags(tags).join(", ");
  persist();
  renderActiveTags();
  paintPostTags();
  if (load) {
    state.appliedTags = state.tags;
    state.page = 0;
    loadPage();
  }
}
function syncVideoControls() {
  for (const video of elements.results.querySelectorAll(
    ".video-player video",
  )) {
    const button = video
      .closest(".video-player")
      .querySelector("[data-video-toggle]");
    const update = () => {
      const playing = !video.paused && !video.ended;
      button.innerHTML = icon(playing ? "pause" : "play");
      button.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
      button.title = playing ? "Пауза" : "Воспроизвести";
    };
    video.addEventListener("play", update);
    video.addEventListener("pause", update);
    video.addEventListener("ended", update);
    update();
  }
}
async function loadPage() {
  persist();
  elements.page.textContent = state.page + 1;
  elements.pageLabel.textContent = `Страница ${state.page + 1}`;
  state.request?.abort();
  const request = (state.request = new AbortController());
  elements.loading.hidden = false;
  elements.results.classList.add("busy");
  elements.prev.disabled = true;
  elements.next.disabled = true;
  elements.results.setAttribute("aria-busy", "true");
  try {
    const params = new URLSearchParams({
      limit: state.pageSize,
      page: state.page,
      tags: resolveTags().join(", "),
      ...filters,
    });
    const response = await fetch(`api/posts?${params}`, {
      signal: request.signal,
    });
    const data = await response.json();
    if (request !== state.request) return;
    if (!response.ok)
      throw new Error(data.error || "Сервер не ответил. Попробуйте ещё раз.");
    if (!Array.isArray(data.posts))
      throw new Error("Некорректный ответ сервера");
    elements.results.innerHTML =
      data.posts.map(card).join("") ||
      '<p class="empty">На этой странице нет подходящих работ. Попробуйте следующую страницу или измените фильтр.</p>';
    paintPostTags();
    syncVideoControls();
    elements.next.disabled = !data.hasMore || state.page >= 10000;
    elements.page.textContent = state.page + 1;
    elements.pageLabel.textContent = `Страница ${state.page + 1} · ${data.posts.length} из ${data.scanned} работ`;
    $("#filter-note").textContent =
      data.warning || "Параметры выдачи получены из источника.";
    scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    if (error.name !== "AbortError" && request === state.request)
      elements.results.innerHTML = `<div class="empty" role="alert"><p>Не удалось загрузить работы</p><small>${escapeHtml(error.message)}</small><button type="button" data-retry>Попробовать снова</button></div>`;
  } finally {
    if (request === state.request) {
      elements.loading.hidden = true;
      elements.results.classList.remove("busy");
      elements.results.setAttribute("aria-busy", "false");
      elements.prev.disabled = state.page === 0;
    }
  }
}
const storedFilters = readObject(sessionStorage, "r34-viewer-filters");
const filters = {
  sort: storedFilters.sort === "fav" ? "fav" : "id",
  period: ["0", "1", "2"].includes(storedFilters.period)
    ? storedFilters.period
    : "1",
  minLikes: /^\d+$/.test(storedFilters.minLikes) ? storedFilters.minLikes : "",
};
for (const [key, value] of Object.entries(filters))
  $(`#filter-${key}`).value = key === "minLikes" ? value || "1" : value;
$("#rating-enabled").checked = filters.minLikes !== "";
$("#filter-minLikes").disabled = !$("#rating-enabled").checked;
$("#rating-enabled").addEventListener("change", () => {
  $("#filter-minLikes").disabled = !$("#rating-enabled").checked;
});
$("#popularity-options").hidden = filters.sort !== "fav";
$("#run-search").addEventListener("click", () => {
  if (!$("#filter-minLikes").checkValidity()) {
    $("#filter-minLikes").reportValidity();
    return;
  }
  addInputTags();
  for (const key of Object.keys(filters))
    filters[key] = $(`#filter-${key}`).value;
  if (!$("#rating-enabled").checked) filters.minLikes = "";
  try {
    sessionStorage.setItem("r34-viewer-filters", JSON.stringify(filters));
  } catch {}
  setTags(splitTags(), true);
});
$("#filter-sort").addEventListener("change", () => {
  $("#popularity-options").hidden = $("#filter-sort").value !== "fav";
});
function paintPostTags() {
  const selected = splitTags().filter((tag) => !superByToken(tag));
  for (const button of elements.results.querySelectorAll("[data-tag]")) {
    const value = selected.find(
      (tag) =>
        tag.replace(/^-/, "").toLowerCase() ===
        decodeURIComponent(button.dataset.tag).toLowerCase(),
    );
    button.classList.toggle("included", !!value && !value.startsWith("-"));
    button.classList.toggle("excluded", !!value?.startsWith("-"));
    button.setAttribute("aria-pressed", String(!!value));
    button.querySelector(".tag-sign").innerHTML = icon(
      value?.startsWith("-") ? "minus" : "plus",
    );
  }
}
attachAutocomplete(elements.input, elements.suggestions, {
  localSuggestions: (query) =>
    state.supertags
      .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({
        name: superToken(item.id),
        displayName: item.name,
        label: `Супер-тег · ${item.tags.length} тегов`,
      })),
});
const builder = { tags: [], editingId: null };
const superSuggestions = $("#super-suggestions");
attachAutocomplete($("#supertag-tags"), superSuggestions);
function renderBuilderTags() {
  $("#supertag-selected").innerHTML = builder.tags
    .map(
      (tag) =>
        `<button type="button" data-builder-chip="${encodeURIComponent(tag)}" class="${tag.startsWith("-") ? "excluded" : "included"}">${escapeHtml(tag)}</button>`,
    )
    .join("");
}
function addBuilderTags() {
  const negative = $("#supertag-mode").getAttribute("aria-pressed") === "true";
  const incoming = splitTags($("#supertag-tags").value).map((tag) =>
    negative ? `-${tag.replace(/^-/, "")}` : tag,
  );
  builder.tags = normalizeTags([...builder.tags, ...incoming]);
  $("#supertag-tags").value = "";
  $("#supertag-tags").dispatchEvent(new Event("input"));
  $("#builder-message").textContent = "";
  renderBuilderTags();
}
tagGestures(
  $("#supertag-selected"),
  "[data-builder-chip]",
  (button, exclude) => {
    builder.tags = toggleTag(
      builder.tags,
      decodeURIComponent(button.dataset.builderChip),
      exclude,
    );
    renderBuilderTags();
  },
);
$("#supertag-tags").addEventListener("tag-selected", addBuilderTags);
$("#supertag-add-tag").addEventListener("click", addBuilderTags);
$("#supertag-tags").addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    (event.key === "Enter" && !superSuggestions.hidden)
  )
    return;
  if (event.key === "Enter") {
    event.preventDefault();
    addBuilderTags();
  }
});
$("#supertag-mode").addEventListener("click", () => {
  const negative = $("#supertag-mode").getAttribute("aria-pressed") !== "true";
  $("#supertag-mode").setAttribute("aria-pressed", String(negative));
  syncSearchIcons();
});
elements.results.addEventListener("click", (event) => {
  if (event.target.closest("[data-retry]")) {
    loadPage();
    return;
  }
  const toggle = event.target.closest("[data-video-toggle]");
  if (toggle) {
    const video = toggle.closest(".video-player").querySelector("video");
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
    return;
  }
  const media = event.target.closest("article .post-media");
  if (!media) return;
  const open = media.closest("article").classList.toggle("tags-open");
  media.setAttribute("aria-expanded", String(open));
});
elements.results.addEventListener("keydown", (event) => {
  if (
    event.target.matches(".image-player") &&
    ["Enter", " "].includes(event.key)
  ) {
    event.preventDefault();
    event.target.click();
  }
});
function renderActiveTags() {
  $("#selected-tags").innerHTML = splitTags()
    .map((tag) => {
      const supertag = superByToken(tag);
      const label = supertag
        ? `${icon("tag")}${escapeHtml(supertag.name)}`
        : escapeHtml(tag);
      return `<button type="button" data-chip="${encodeURIComponent(tag)}" class="${supertag ? `supertag-chip${tag.startsWith("-") ? " inverted" : ""}` : tag.startsWith("-") ? "excluded" : "included"}" title="Нажать: убрать · Удержать: инвертировать">${label}</button>`;
    })
    .join("");
}
function addInputTags() {
  const incoming = splitTags(elements.input.value).map((tag) =>
    $("#tag-mode").getAttribute("aria-pressed") === "true"
      ? "-" + tag.replace(/^-/, "")
      : tag,
  );
  setTags([...splitTags(), ...incoming], false);
  elements.input.value = "";
  elements.input.dispatchEvent(new Event("input"));
}
tagGestures($("#selected-tags"), "[data-chip]", (button, exclude) =>
  setTags(
    toggleTag(splitTags(), decodeURIComponent(button.dataset.chip), exclude),
    false,
  ),
);
function syncSearchIcons() {
  const negative = $("#tag-mode").getAttribute("aria-pressed") === "true";
  $("#tag-mode").innerHTML = icon(negative ? "minus" : "plus");
  $("#search button[type=submit]").innerHTML = icon("arrow");
  $("#supertag-mode").innerHTML = icon(
    $("#supertag-mode").getAttribute("aria-pressed") === "true"
      ? "minus"
      : "plus",
  );
  $("#supertag-add-tag").innerHTML = icon("arrow");
  $("#run-search").innerHTML = `${icon("search")}<span>Поиск</span>`;
}
$("#tag-mode").addEventListener("click", () => {
  const negative = $("#tag-mode").getAttribute("aria-pressed") !== "true";
  $("#tag-mode").setAttribute("aria-pressed", String(negative));
  syncSearchIcons();
});
elements.input.addEventListener("tag-selected", addInputTags);
tagGestures(elements.results, "[data-tag]", (button, exclude) =>
  setTags(
    toggleTag(splitTags(), decodeURIComponent(button.dataset.tag), exclude),
    false,
  ),
);
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  addInputTags();
});
elements.prev.addEventListener("click", () => {
  if (state.page > 0) {
    state.page--;
    loadPage();
  }
});
elements.next.addEventListener("click", () => {
  if (state.page < 10000) {
    state.page++;
    loadPage();
  }
});
elements.pageSize.value = state.pageSize;
elements.pageSize.addEventListener("change", () => {
  state.pageSize = pageSize(elements.pageSize.value);
  elements.pageSize.value = state.pageSize;
  state.page = 0;
  persist();
  loadPage();
});
function renderCollections() {
  elements.settingsSupertags.innerHTML = state.supertags.length
    ? state.supertags
        .map(
          (item) =>
            `<article><button type="button" class="super-main" data-edit-super="${escapeHtml(item.id)}"><span class="super-icon">${icon("tag")}</span><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description || `${item.tags.length} тегов`)}${item.default ? " · по умолчанию" : ""}</small></span></button><span class="super-count">${item.tags.length}</span><button type="button" class="super-delete" data-remove-super="${escapeHtml(item.id)}" title="Удалить">×</button></article>`,
        )
        .join("")
    : '<p class="no-super">Пока пусто. Создайте первый набор ниже.</p>';
}
const settingsToggle = $("#toggle-settings");
function closeSettings() {
  elements.settings.close();
}
settingsToggle.addEventListener("click", () => {
  elements.settings.showModal();
  settingsToggle.setAttribute("aria-expanded", "true");
});
$("#close-settings").addEventListener("click", closeSettings);
elements.settings.addEventListener("close", () => {
  settingsToggle.setAttribute("aria-expanded", "false");
  settingsToggle.focus();
});
elements.settings.addEventListener("click", (event) => {
  if (event.target === elements.settings) {
    const box = elements.settings.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeSettings();
  }
});
function resetBuilder() {
  builder.editingId = null;
  builder.tags = [];
  $("#supertag-form").reset();
  $("#supertag-mode").setAttribute("aria-pressed", "false");
  $("#save-supertag").textContent = "Сохранить супер-тег";
  $("#cancel-edit").hidden = true;
  $("#builder-message").textContent = "";
  renderBuilderTags();
  syncSearchIcons();
}
$("#cancel-edit").addEventListener("click", resetBuilder);
function editSupertag(item) {
  $("#cancel-edit").hidden = false;
  $("#builder-message").textContent = "";
  builder.editingId = item.id;
  builder.tags = [...item.tags];
  $("#supertag-name").value = item.name;
  $("#supertag-description").value = item.description;
  $("#supertag-default").checked = item.default;
  $("#save-supertag").textContent = "Сохранить изменения";
  renderBuilderTags();
  $("#supertag-name").focus();
}
elements.settingsSupertags.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-super]"),
    edit = event.target.closest("[data-edit-super]");
  if (remove) {
    const id = remove.dataset.removeSuper,
      token = superToken(id);
    const used = splitTags(state.appliedTags).some(
      (tag) => tag.replace(/^-/, "") === token,
    );
    state.supertags = state.supertags.filter((item) => item.id !== id);
    state.tags = splitTags()
      .filter((tag) => tag.replace(/^-/, "") !== token)
      .join(", ");
    state.appliedTags = splitTags(state.appliedTags)
      .filter((tag) => tag.replace(/^-/, "") !== token)
      .join(", ");
    if (builder.editingId === id) resetBuilder();
    persist();
    renderActiveTags();
    paintPostTags();
    renderCollections();
    if (used) {
      state.page = 0;
      loadPage();
    }
  } else if (edit)
    editSupertag(
      state.supertags.find((item) => item.id === edit.dataset.editSuper),
    );
});
$("#supertag-form").addEventListener("submit", (event) => {
  event.preventDefault();
  addBuilderTags();
  const name = $("#supertag-name").value.trim(),
    description = $("#supertag-description").value.trim();
  if (!name || !builder.tags.length) {
    $("#builder-message").textContent =
      "Укажите название и добавьте хотя бы один тег.";
    return;
  }
  const id = builder.editingId || `set-${makeId()}`;
  const value = {
    id,
    ownerId: anonymousUser.id,
    name,
    description,
    default: $("#supertag-default").checked,
    tags: [...builder.tags],
  };
  try {
    state.supertags = saveCollection(state.supertags, value, builder.editingId);
  } catch (error) {
    $("#builder-message").textContent = error.message;
    return;
  }
  const used = splitTags(state.appliedTags).some(
    (tag) => tag.replace(/^-/, "") === superToken(id),
  );
  resetBuilder();
  persist();
  renderCollections();
  renderActiveTags();
  if (used) {
    state.page = 0;
    loadPage();
  }
});

syncSearchIcons();
elements.input.value = "";
renderActiveTags();
renderBuilderTags();
renderCollections();
loadPage();
fetch("api/health")
  .then((response) => response.json())
  .then((data) => {
    elements.status.innerHTML = `<i></i>${data.ok ? "сеть доступна" : "сеть нестабильна"}`;
    elements.status.className = data.ok ? "ok" : "bad";
  })
  .catch(() => {
    elements.status.innerHTML = "<i></i>сеть недоступна";
    elements.status.className = "bad";
  });

