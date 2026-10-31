import React, { useEffect, useState } from "react";
import { createDraft, updateDraft } from "./api";
const empty = {
  title: "",
  body: "",
  scriptureReference: "",
  author: "City4Christ",
};
export function DevotionalForm({ entry, onSaved, onReload, onForbidden }) {
  const [fields, setFields] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    setFields(
      entry
        ? {
            title: entry.title,
            body: entry.body,
            scriptureReference: entry.scriptureReference,
            author: entry.author,
          }
        : empty,
    );
    setError("");
    setNotice("");
    setConflict(false);
  }, [entry]);
  function field(name) {
    return {
      value: fields[name],
      onChange: (e) => setFields((old) => ({ ...old, [name]: e.target.value })),
    };
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setConflict(false);
    const status = event.nativeEvent.submitter?.value || "draft";
    try {
      const result = entry
        ? await updateDraft(entry.id, {
            ...fields,
            version: entry.version,
            status,
          })
        : await createDraft(fields);
      onSaved(result);
      setNotice(
        result.status === "published"
          ? "Devotional published."
          : "Draft saved.",
      );
    } catch (e) {
      const labels = {
        title: "Title",
        body: "Devotional text",
        scriptureReference: "Scripture reference",
        author: "Author",
      };
      const details = Object.entries(labels)
        .filter(([key]) => typeof e.fields?.[key] === "string")
        .map(([key, label]) => `${label}: ${e.fields[key]}`);
      setError([e.message, ...details].join(" "));
      setConflict(e.status === 409);
      if (e.status === 401 || e.status === 403) onForbidden();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      aria-label="Devotional editor"
      onSubmit={save}
      className="devotional-form"
    >
      <h3>{entry ? "Edit devotional" : "New devotional"}</h3>
      {entry && (
        <p>
          Status: <strong>{entry.status}</strong> · Version {entry.version}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {conflict && (
        <button
          className="btn soft"
          type="button"
          disabled={busy}
          onClick={onReload}
        >
          Reload latest version
        </button>
      )}
      <label>
        Title
        <input required maxLength={200} {...field("title")} />
      </label>
      <label>
        Devotional text
        <textarea required maxLength={20000} rows={10} {...field("body")} />
      </label>
      <label>
        Scripture reference
        <input
          maxLength={200}
          placeholder="For example, Psalm 28:7"
          {...field("scriptureReference")}
        />
      </label>
      <label>
        Author
        <input maxLength={200} {...field("author")} />
      </label>
      <p>Text is displayed as written. HTML formatting is not supported.</p>
      <div className="devotional-actions">
        <button
          className="btn soft"
          type="submit"
          value="draft"
          disabled={busy}
        >
          {!entry
            ? "Create draft"
            : entry.status === "published"
              ? "Save as draft"
              : "Save draft"}
        </button>
        <button
          className="btn gold"
          type="submit"
          value="published"
          disabled={busy || !entry}
        >
          {entry?.status === "published" ? "Publish changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}
