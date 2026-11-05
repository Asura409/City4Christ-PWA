import React from "react";
import { bibleLink } from "@/bible/api";
import { Icon } from "@/lib/icons";
import { useTodayVerse } from "./useTodayVerse";
export function DailyVerseCard() {
  const { data, busy, error, refresh } = useTodayVerse();
  return (
    <section className="hero daily-home-card" aria-label="Daily verse">
      <span className="pill">
        <Icon name="sun" />
        Daily bread
      </span>
      <p className="daily-home-date"><small>{data?.date ? data.date + " · " : ""}GMT+1</small></p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Loading today’s verse…</p>
      ) : data.verse ? (
        <>
          <p className="verse">{data.verse.text}</p>
          <div className="daily-home-reference"><cite>{data.verse.scriptureReference}</cite>{data.verse.translation && <span>{data.verse.translation}</span>}</div>
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
