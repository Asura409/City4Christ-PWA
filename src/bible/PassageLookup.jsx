import React, { useEffect, useRef } from "react";
import { useBibleLookup } from "./useBibleLookup";
import { PassageView } from "./PassageView";
import "./bible.css";
export function PassageLookup({ onUse, autoUse = false, embedded = false, ...initial }) {
  const s = useBibleLookup(initial);
  const imported = useRef("");
  useEffect(() => {
    if (!autoUse || !s.passage || !onUse) return;
    const key = `${s.passage.reference}:${s.passage.translation.id}`;
    if (imported.current === key) return;
    imported.current = key;
    onUse(s.passage);
  }, [autoUse, onUse, s.passage]);
  const submit = (e) => {
    e.preventDefault();
    void s.search(s.buildReference(), s.translation);
  };
  const controls = (
    <>
      <label>
        Book
        <select disabled={!s.ready} value={s.book} onChange={(e) => s.changeBook(e.target.value)}>
          {s.books.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
      </label>
      <label>
        Chapter
        <select disabled={!s.ready} value={s.chapter} onChange={(e) => s.changeChapter(e.target.value)}>
          {Array.from({ length: s.books.find((item) => item.name === s.book)?.chapters || 1 }, (_, i) => i + 1).map((number) => <option key={number} value={number}>{number}</option>)}
        </select>
      </label>
      <div className="bible-verse-range">
        <label>Verse (optional)<select disabled={!s.ready} value={s.verse} onChange={(e) => s.changeVerse(e.target.value)}><option value="">Whole chapter</option>{Array.from({ length: 176 }, (_, i) => i + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
        {s.verse && <label>Through<select disabled={!s.ready} value={s.endVerse} onChange={(e) => s.changeEndVerse(e.target.value)}><option value="">Single verse</option>{Array.from({ length: 176 - Number(s.verse) }, (_, i) => Number(s.verse) + i + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>}
      </div>
      <label>Bible version<select value={s.translation} disabled={!s.ready} onChange={(e) => s.changeTranslation(e.target.value)}>{s.translations.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <button className="btn gold" disabled={!s.ready || s.busy} type={embedded ? "button" : "submit"} onClick={embedded ? submit : undefined}>Look up passage</button>
    </>
  );
  return (
    <section className="bible-lookup">
      {embedded ? <div className="bible-lookup-form">{controls}</div> : <form aria-label="Bible lookup" onSubmit={submit}>{controls}</form>}
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
