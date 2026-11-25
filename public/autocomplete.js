export function attachAutocomplete(input, list, options = {}) {
  let timer,
    controller,
    revision = 0,
    selected = -1,
    items = [];
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  list.setAttribute("role", "listbox");
  function close() {
    revision++;
    clearTimeout(timer);
    controller?.abort();
    list.hidden = true;
    selected = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function choose(index) {
    const item = items[index];
    if (!item) return;
    const prefix = input.value.trim().startsWith("-") ? "-" : "";
    input.value = prefix + (item.displayName || item.name);
    input.dataset.selectedTag = prefix + item.name;
    close();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  function highlight(index) {
    selected = index;
    Array.from(list.children).forEach((node, i) =>
      node.setAttribute("aria-selected", String(i === index)),
    );
    const node = list.children[index];
    if (node) {
      input.setAttribute("aria-activedescendant", node.id);
      node.scrollIntoView({ block: "nearest" });
    }
  }
  function refresh() {
    close();
    const query = input.value.trim().replace(/^-/, "");
    if (query.length < 2) return;
    const version = revision;
    timer = setTimeout(async () => {
      controller = new AbortController();
      const localItems = (options.localSuggestions?.(query) || []).filter(
        (item) => typeof item?.name === "string",
      );
      let remoteItems = [];
      try {
        const response = await fetch(
          `api/tags?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Suggestions unavailable");
        const data = await response.json();
        remoteItems = (data.tags || []).filter(
          (item) => typeof item?.name === "string",
        );
      } catch {
        // Saved super-tags remain available even while the remote tag index is down.
      }
      if (version !== revision || document.activeElement !== input) return;
      items = [...localItems, ...remoteItems];
      list.replaceChildren();
      items.forEach((item, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.tabIndex = -1;
        button.id = `${list.id}-${i}`;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", "false");
        const name = document.createElement("b");
        name.textContent = item.displayName || item.name;
        const label = document.createElement("span");
        label.textContent = item.label || "";
        button.append(name, label);
        button.addEventListener("pointerdown", (event) =>
          event.preventDefault(),
        );
        button.addEventListener("click", () => choose(i));
        list.append(button);
      });
      list.hidden = !items.length;
      input.setAttribute("aria-expanded", String(!!items.length));
    }, 200);
  }
  input.addEventListener("input", () => {
    delete input.dataset.selectedTag;
    refresh();
  });
  input.addEventListener("click", refresh);
  input.addEventListener("blur", close);
  input.form?.addEventListener("reset", close);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (list.hidden || event.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      highlight(
        (selected + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length,
      );
    } else if (
      event.key === "Enter" ||
      (event.key === "Tab" && selected >= 0)
    ) {
      event.preventDefault();
      choose(selected < 0 ? 0 : selected);
    }
  });
}
