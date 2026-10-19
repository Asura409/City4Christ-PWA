import { status, failure, onSubmit, onClick } from "../ui.js";
export function pager({ api, form, container, more, path, publicRead, card }) {
  let cursor = "",
    filters = {},
    generation = 0,
    controller = null;
  async function load(reset) {
    const current = ++generation;
    if (reset) {
      controller?.abort();
      controller = new AbortController();
      cursor = "";
      filters = Object.fromEntries(new FormData(form));
      container.replaceChildren();
    }
    const params = new URLSearchParams({ ...filters, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    more.disabled = true;
    try {
      const result = await api.request(path + "?" + params, {
        public: publicRead,
        signal: controller?.signal,
      });
      if (current !== generation) return;
      for (const item of result.data) container.append(card(item));
      cursor = result.meta.nextCursor;
      more.hidden = !cursor;
      if (!container.children.length) status("No matching results.");
      else status("");
    } catch (error) {
      if (current === generation) failure(error);
    } finally {
      if (current === generation) more.disabled = false;
    }
  }
  onSubmit(form, () => load(true));
  onClick(more, () => load(false));
  return () => load(true);
}
