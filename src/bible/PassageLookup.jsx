import React from "react";
import { useBibleLookup } from "./useBibleLookup";
import { PassageView } from "./PassageView";
import "./bible.css";
export function PassageLookup({ onUse, ...initial }) {
  const s = useBibleLookup(initial);
  return (
    <section className="bible-lookup">
      <form
        aria-label="Bible lookup"
        onSubmit={(e) => {
          e.preventDefault();
          void s.search();
        }}
      >
        <label>
          Bible reference
          <input
            required
            maxLength={128}
            placeholder="John 3:16-18 or Psalm 23"
            value={s.reference}
            disabled={!s.ready}
            onChange={(e) => s.changeReference(e.target.value)}
          />
        </label>
        <label>
          Bible version
          <select
            value={s.translation}
            disabled={!s.ready}
            onChange={(e) => s.changeTranslation(e.target.value)}
          >
            {s.translations.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn gold"
          disabled={!s.ready || s.busy}
          type="submit"
        >
          Look up passage
        </button>
      </form>
      {!s.ready && !s.error && <p role="status">Loading Bible versions…</p>}
      {s.busy && <p role="status">Looking up passage…</p>}
      {s.notice && <p role="status">{s.notice}</p>}
      {s.error && <p role="alert">{s.error}</p>}
      {!s.ready && s.error && (
        <button type="button" className="btn soft" onClick={s.reload}>
          Reload Bible versions
        </button>
      )}
      {s.passage && (
        <PassageView passage={s.passage} onChapter={s.search} onUse={onUse} />
      )}
    </section>
  );
}
