import React, { useEffect, useState } from "react";
import { PassageLookup } from "@/bible/PassageLookup";
import { createVerse, updateVerse } from "./api";
const empty = {
  displayDate: "",
  text: "",
  scriptureReference: "",
  translation: "",
};
export function DailyVerseForm({ entry, onSaved, onReload, onForbidden }) {
  const [fields, setFields] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    setFields(
      entry
        ? {
            displayDate: entry.displayDate,
            text: entry.text,
            scriptureReference: entry.scriptureReference,
            translation: entry.translation,
          }
        : empty,
    );
    setError("");
    setConflict(false);
  }, [entry]);
  const field = (name) => ({
    value: fields[name],
    onChange: (e) => setFields((old) => ({ ...old, [name]: e.target.value })),
  });
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setConflict(false);
    const status = event.nativeEvent.submitter?.value || "draft";
    try {
      const value = entry
        ? await updateVerse(entry.id, {
            ...fields,
            status,
            version: entry.version,
          })
        : await createVerse(fields);
      onSaved(value);
    } catch (e) {
      const labels = {
        displayDate: "Display date",
        text: "Verse text",
        scriptureReference: "Scripture reference",
        translation: "Translation",
      };
      const details = Object.entries(labels)
        .filter(([key]) => typeof e.fields?.[key] === "string")
        .map(([key, label]) => `${label}: ${e.fields[key]}`);
      setError([e.message, ...details].join(" "));
      setConflict(e.status === 409 && e.code === "version_conflict");
      if (e.status === 401 || e.status === 403) onForbidden();
    } finally {
      setBusy(false);
    }
  }
  function usePassage(passage) {
    if (
      !passage.translation.canImport ||
      Array.from(passage.text).length > 4000
    )
      return;
    setFields((old) => ({
      ...old,
      text: passage.text,
      scriptureReference: passage.reference,
      translation: passage.translation.name,
    }));
    setError("");
    setConflict(false);
  }
  return (
    <>
      <h3>Find scripture for Daily Bread</h3>
      <p>
        Choose a passage to fill the editor, then review and save or publish it
        separately.
      </p>
      <PassageLookup
        onUse={usePassage}
        autoLookup={false}
        initialReference={entry?.scriptureReference || ""}
        initialTranslationName={entry?.translation || ""}
      />
      <form
        aria-label="Daily verse editor"
        className="devotional-form"
        onSubmit={save}
      >
        <h3>{entry ? "Edit daily verse" : "New daily verse"}</h3>
        {entry && (
          <p>
            Status: <strong>{entry.status}</strong> · {entry.displayDate} ·
            Version {entry.version}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
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
          Display date (GMT+1)
          <input
            type="date"
            required
            min="0001-01-01"
            max="9999-12-31"
            {...field("displayDate")}
          />
        </label>
        <label>
          Verse text
          <textarea required rows={5} maxLength={4000} {...field("text")} />
        </label>
        <label>
          Scripture reference
          <input required maxLength={200} {...field("scriptureReference")} />
        </label>
        <label>
          Translation / attribution
          <input maxLength={100} {...field("translation")} />
        </label>
        <p>
          A published verse appears only on its assigned GMT+1 date. Only one
          can be published for each date.
        </p>
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
            {entry?.status === "published"
              ? "Publish changes"
              : "Publish verse"}
          </button>
        </div>
      </form>
    </>
  );
}
