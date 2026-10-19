import { $, element, failure, dateLabel, videoLink } from "../ui.js";
import { pager } from "../components/pager.js";
export async function sermonPage({ api }) {
  const id = new URL(location.href).searchParams.get("sermon");
  if (id) {
    $("#sermon-search").hidden = true;
    $("#sermon-detail").hidden = false;
    try {
      const { data: s } = await api.request(
        "/api/v1/sermons/" + encodeURIComponent(id),
        { public: true },
      );
      const content = $("#sermon-detail-content");
      content.replaceChildren(
        element("h2", {}, [s.title]),
        element("p", { class: "muted" }, [
          s.speaker + " · " + dateLabel(s.preachedAt),
        ]),
        element("p", {}, [s.summary]),
      );
      if (s.series) content.append(element("p", {}, ["Series: " + s.series]));
      if (s.topic) content.append(element("p", {}, ["Topic: " + s.topic]));
      const link = videoLink(s.videoUrl);
      if (link) content.append(link);
    } catch (error) {
      failure(error);
    }
    return;
  }
  await pager({
    api,
    form: $("#sermon-search"),
    container: $("#sermon-results"),
    more: $("#sermon-more"),
    path: "/api/v1/sermons",
    publicRead: true,
    card: (s) =>
      element("article", { class: "result-card" }, [
        element("h2", {}, [s.title]),
        element("p", {}, [s.summary]),
        element("p", { class: "muted" }, [
          s.speaker + " · " + dateLabel(s.preachedAt),
        ]),
        element(
          "a",
          {
            href: "word.html?" + new URLSearchParams({ sermon: s.id }),
            class: "button-link secondary",
          },
          ["Open sermon"],
        ),
      ]),
  })();
}
