import React from "react";
import { usePastoralList, ListState } from "./usePastoralList";
export function PastorDirectory({ revision, onSelect }) {
  const state = usePastoralList("/api/v1/pastors", revision);
  return (
    <section aria-label="Pastor directory">
      <h2>Choose a pastor</h2>
      {!state.busy && !state.error && !state.items.length && (
        <p>No pastors have published availability yet.</p>
      )}
      <div className="pastoral-grid">
        {state.items.map((p) => (
          <article className="auth-card" key={p.id}>
            <h3>
              {p.firstName} {p.lastName}
            </h3>
            <p>{p.bio}</p>
            <p>Time zone: {p.timeZone}</p>
            <button className="btn soft" onClick={() => onSelect(p)}>
              View availability for {p.firstName} {p.lastName}
            </button>
          </article>
        ))}
      </div>
      <ListState state={state} />
    </section>
  );
}
