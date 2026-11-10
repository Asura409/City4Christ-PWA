import React from "react";
import { safeUrl } from "../lib/sanitize.js";
export function PassageView({ passage, onChapter, onUse }) {
  const verses = Array.isArray(passage.verses) ? passage.verses : [],
    first = verses[0],
    canUse =
      passage.translation.canImport && Array.from(passage.text).length <= 4000;
  return (
    <section className="bible-passage" aria-label="Bible passage">
      <h3>{passage.reference}</h3>
      <p>{passage.translation.name}</p>
      {verses.length > 0 ? (
        <ol className="bible-verses">
          {verses.map((v) => (
            <li key={`${v.bookId}/${v.chapter}/${v.number}`} value={v.number}>
              <small>
                {v.bookName} {v.chapter}:{v.number}
              </small>
              <p>{v.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="bible-text-fallback">{passage.text}</p>
      )}
      <p className="bible-credit">
        {passage.translation.license} ·{" "}
        <a
          href={safeUrl(passage.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {passage.source}
        </a>
      </p>
      <div className="devotional-actions">
        {first && <button
          type="button"
          className="btn soft"
          onClick={() =>
            onChapter(
              first.bookName + " " + first.chapter,
              passage.translation.id,
            )
          }
        >
          Read full chapter
        </button>}
        {onUse && (
          <button
            type="button"
            className="btn gold"
            disabled={!canUse}
            onClick={() => onUse(passage)}
          >
            Use passage in editor
          </button>
        )}
      </div>
      {onUse && !canUse && (
        <p>
          Choose an importable passage of no more than 4,000 characters for
          Daily Bread.
        </p>
      )}
    </section>
  );
}
