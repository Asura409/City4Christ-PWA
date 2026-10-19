import { $, element, failure } from "../ui.js";
import { pager } from "../components/pager.js";
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
    card: (m) =>
      element("article", { class: "result-card" }, [
        element("h2", {}, [m.firstName + " " + m.lastName]),
        element("p", { class: "account-id" }, ["Member ID: " + m.id]),
      ]),
  })();
}
