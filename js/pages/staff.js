import { roleAppointments } from "../components/role-appointments.js";
import {
  $,
  status,
  failure,
  onSubmit,
  onClick,
  value,
  localDateInput,
} from "../ui.js";
export async function staffPage({ api, session }) {
  const editor = $("#sermon-editor"),
    load = $("#load-sermon"),
    roles = $("#role-form");
  let current = null,
    baseline = {};
  const editable = [
    "title",
    "summary",
    "speaker",
    "series",
    "topic",
    "videoUrl",
  ];
  function fill(s) {
    current = s;
    for (const key of editable) editor.elements[key].value = s[key] || "";
    editor.elements.preachedAt.value = localDateInput(s.preachedAt);
    baseline = Object.fromEntries(new FormData(editor));
    $("#publication-actions").hidden = false;
    $("#save-sermon").textContent = "Save changes";
    $("#editor-state").textContent =
      `${s.status} · version ${s.version} · ID ${s.id}`;
    load.elements.sermonId.value = s.id;
    $("#view-public-sermon").href =
      "word.html?" + new URLSearchParams({ sermon: s.id });
  }
  function reset() {
    current = null;
    baseline = {};
    editor.reset();
    load.reset();
    $("#publication-actions").hidden = true;
    $("#save-sermon").textContent = "Create draft";
    $("#editor-state").textContent =
      "Create a new draft, or load an existing sermon to edit it.";
  }
  onSubmit(load, async () => {
    const { data } = await api.request(
      "/api/v1/admin/sermons/" +
        encodeURIComponent(value(load, "sermonId").trim()),
    );
    fill(data);
    status("Sermon loaded.");
  });
  onSubmit(editor, async () => {
    const body = {};
    for (const key of editable)
      if (!current || value(editor, key) !== baseline[key])
        body[key] = value(editor, key);
    if (!current || value(editor, "preachedAt") !== baseline.preachedAt)
      body.preachedAt = new Date(value(editor, "preachedAt")).toISOString();
    if (current) {
      if (!Object.keys(body).length) {
        status("No sermon changes to save.");
        return;
      }
      body.version = current.version;
    }
    const { data } = await api.request(
      "/api/v1/admin/sermons" + (current ? "/" + current.id : ""),
      { method: current ? "PATCH" : "POST", body },
    );
    fill(data);
    status(
      current.version === 1 ? "Draft created." : "Sermon changes saved.",
      "success",
    );
  });
  onClick($("#new-sermon"), async () => {
    reset();
    status("Ready for a new draft.");
  });
  async function publish(state) {
    if (!current) return;
    const body = { version: current.version, status: state };
    if (state === "scheduled") {
      const input = $("#schedule-time");
      if (!input.value) {
        status("Choose a future publication time.", "error");
        return;
      }
      body.publishAt = new Date(input.value).toISOString();
    }
    const { data } = await api.request("/api/v1/admin/sermons/" + current.id, {
      method: "PATCH",
      body,
    });
    fill(data);
    status(
      state === "draft"
        ? "Sermon unpublished."
        : state === "scheduled"
          ? "Publication scheduled."
          : "Sermon published.",
      "success",
    );
  }
  onClick($("#publish-sermon"), () => publish("published"));
  onClick($("#unpublish-sermon"), () => publish("draft"));
  onClick($("#schedule-sermon"), () => publish("scheduled"));
  roleAppointments(api, roles);
  try {
    await session();
  } catch (error) {
    failure(error);
  }
}
