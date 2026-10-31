import React from "react";
import { bibleLink } from "@/bible/api";
import { Icon } from "@/lib/icons";
import { useTodayVerse } from "./useTodayVerse";
export function DailyVerseCard() {
  const { data, busy, error, refresh } = useTodayVerse();
  return (
    <section className="hero" aria-label="Daily bread">
      <span className="pill">
        <Icon name="sun" />
        Daily bread
      </span>
      <p>
        <small>{data?.date ? data.date + " · " : ""}GMT+1</small>
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Loading today’s verse…</p>
      ) : data.verse ? (
        <>
          <p className="verse">{data.verse.text}</p>
          <cite>
            {data.verse.scriptureReference}
            {data.verse.translation ? " · " + data.verse.translation : ""}
          </cite>
        </>
      ) : (
        <p>No verse has been published for today.</p>
      )}
      {data?.verse && (
        <a
          className="btn soft"
          href={bibleLink(
            data.verse.scriptureReference,
            data.verse.translation,
          )}
        >
          Read passage in Bible
        </a>
      )}
      <div className="devotional-actions">
        <button className="btn soft" disabled={busy} onClick={refresh}>
          Refresh daily verse
        </button>
        <a className="btn soft" href="#/devotionals">
          Read devotionals
        </a>
      </div>
    </section>
  );
}
