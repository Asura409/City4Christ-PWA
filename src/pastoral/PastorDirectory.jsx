import React from "react";
import { Avatar } from "@/components/Avatar";
import { usePastoralList, ListState } from "./usePastoralList";

export function PastorDirectory({ revision, onSelect }) {
  const state = usePastoralList("/api/v1/pastors", revision);
  return (
    <section aria-label="Pastor directory">
      <div className="pastor-directory-head">
        <div>
          <p className="pastoral-eyebrow">CHOOSE A PASTOR</p>
          <h2>Available for pastoral care</h2>
        </div>
        <span className="pastoral-count">{state.items.length}</span>
      </div>
      {!state.busy && !state.error && !state.items.length && (
        <p className="pastor-muted">No pastors have published availability yet.</p>
      )}
      <div className="pastor-directory-grid">
        {state.items.map((p) => (
          <article className="pastor-card" key={p.id}>
            <div className="pastor-card-head">
              <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar?.url} size={46} />
              <div className="pastor-card-copy">
                <h3>{p.firstName} {p.lastName}</h3>
                <span className="pastor-card-zone">{p.timeZone || "UK time"}</span>
              </div>
            </div>
            <p className="pastor-bio">{p.bio}</p>
            <button className="btn soft" type="button" onClick={() => onSelect(p)}>
              View availability for {p.firstName} {p.lastName}
            </button>
          </article>
        ))}
      </div>
      <p className="pastor-muted pastor-directory-note">Times are shown in the pastor’s time zone. A request holds its slot until the pastor reviews it.</p>
      <ListState state={state} />
    </section>
  );
}
