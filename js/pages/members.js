import { $, element, failure } from "../ui.js";
import { pager } from "../components/pager.js";

function safePhotoURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export async function membersPage({ api, session }) {
  try {
    await session();
  } catch (error) {
    failure(error);
    return;
  }
  await pager({
    api,
    form: $("#member-search"),
    container: $("#member-results"),
    more: $("#member-more"),
    path: "/api/v1/members",
    publicRead: false,
    card: (m) => {
      const name = m.firstName + " " + m.lastName;
      const photo = safePhotoURL(m.avatar?.url);
      return element("article", { class: "result-card member-result-card" }, [
        photo ? element("img", { class: "member-result-avatar", src: photo, alt: name, loading: "lazy" }) : null,
        element("h2", {}, [name]),
        element("p", { class: "account-id" }, ["Member ID: " + m.id]),
      ].filter(Boolean));
    },
  })();
}
