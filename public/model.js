// Pure state helpers shared by the search and collection editor.
export function normalizeTags(values) {
  const tags = new Map();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const tag = value.trim(),
      name = tag.replace(/^-/, "").trim();
    if (name)
      tags.set(name.toLowerCase(), tag.startsWith("-") ? `-${name}` : name);
  }
  return [...tags.values()];
}
export function splitTags(value = "") {
  return normalizeTags(typeof value === "string" ? value.split(",") : []);
}
export function pageSize(value) {
  return Math.min(100, Math.max(10, Math.trunc(Number(value)) || 30));
}
export function readObject(storage, key, fallbackKey) {
  try {
    const value = JSON.parse(
      storage.getItem(key) ||
        (fallbackKey && storage.getItem(fallbackKey)) ||
        "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}
export function normalizeCollections(values, ownerId) {
  if (!Array.isArray(values)) return [];
  const ids = new Set();
  return values
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      let id =
        typeof item.id === "string" && item.id ? item.id : `set-${index}`;
      while (ids.has(id)) id += `-${index}`;
      ids.add(id);
      const tags = Array.isArray(item.tags)
        ? item.tags
        : Object.entries(item.tags || {}).map(([tag, mode]) =>
            mode === "-" ? `-${tag}` : tag,
          );
      return {
        id,
        ownerId: item.ownerId || ownerId,
        name: String(item.name || "Без названия"),
        description: String(item.description || ""),
        default: Boolean(item.default),
        tags: normalizeTags(tags),
      };
    });
}
export function saveCollection(collections, value, editingId) {
  const duplicate = collections.find(
    (item) =>
      item.id !== editingId &&
      item.name.toLowerCase() === value.name.toLowerCase(),
  );
  if (duplicate) throw new Error("Набор с таким названием уже существует.");
  return editingId
    ? collections.map((item) =>
        item.id === editingId ? { ...value, id: editingId } : item,
      )
    : [...collections, value];
}

