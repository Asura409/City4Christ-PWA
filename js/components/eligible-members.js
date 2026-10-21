import { $, element, onSubmit, onClick, value, status } from "../ui.js";
export function eligibleMembers(api, onSelect) {
  const form = $("#church-member-search"),
    results = $("#church-member-results"),
    more = $("#church-members-more");
  let generation = 0,
    cursor = "",
    query = "";
  function clear() {
    generation++;
    cursor = "";
    results.replaceChildren();
    more.hidden = true;
    onSelect(null);
  }
  form.elements.query.addEventListener("input", clear);
  async function search(next = false) {
    const text = value(form, "query").trim();
    if (text.length < 3 || text.length > 100) {
      status("Enter between 3 and 100 characters.", "error");
      return;
    }
    if (!next) {
      clear();
      query = text;
    }
    const ownGeneration = generation;
    const params = new URLSearchParams({ query, limit: "20" });
    if (next && cursor) params.set("cursor", cursor);
    const { data, meta } = await api.request(
      "/api/v1/admin/role-candidates?" + params,
    );
    if (ownGeneration !== generation) return;
    for (const member of data) {
      const button = element("button", { type: "button", class: "secondary" }, [
        `${member.firstName} ${member.lastName} · ${member.email}${member.mfaEnabled ? " · authenticator enabled" : ""}`,
      ]);
      onClick(button, () => onSelect(member));
      results.append(element("li", {}, [button]));
    }
    cursor = meta?.nextCursor || "";
    more.hidden = !cursor;
    if (!data.length && !next)
      results.append(element("li", {}, ["No eligible accounts found."]));
  }
  onSubmit(form, () => search());
  onClick(more, () => search(true));
  return { clear };
}
