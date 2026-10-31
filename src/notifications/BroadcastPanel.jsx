import React, { useEffect, useState } from "react";
import { getAccess, listGroups } from "@/groups/api";
import {
  listBroadcasts,
  createBroadcast,
  reviewBroadcast,
  sendBroadcast,
} from "./broadcastApi";
function BroadcastAudience({ groupId, label }) {
  const [items, setItems] = useState([]),
    [draft, setDraft] = useState(null),
    [reviewed, setReviewed] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const c = new AbortController();
    listBroadcasts(groupId, c.signal)
      .then(setItems)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [groupId]);
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="auth-card broadcast-panel"
      aria-label="Broadcast management"
    >
      <h2>Church announcements</h2>
      <p>
        Audience: {label}. Drafts are reviewed before sending. In-app delivery
        does not mean a push was received.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        aria-label="Broadcast draft"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            data = new FormData(form);
          void action(async () => {
            const b = await createBroadcast({
              title: data.get("title"),
              body: data.get("body"),
              audience: groupId ? "group" : "church",
              ...(groupId ? { groupId } : {}),
            });
            setDraft(b);
            setReviewed(false);
            setConfirmed(false);
            setNotice("");
            setItems((x) => [b, ...x]);
            form.reset();
          });
        }}
      >
        <label>
          Announcement title
          <input name="title" required maxLength={120} />
        </label>
        <label>
          Announcement message
          <textarea name="body" required maxLength={500} />
        </label>
        <button className="btn soft" disabled={busy}>
          Create broadcast draft
        </button>
      </form>
      {draft && (
        <article aria-label="Selected broadcast">
          <h3>{draft.title}</h3>
          <p>{draft.body}</p>
          <p>Status: {draft.status}</p>
          {draft.status === "draft" && (
            <>
              <button
                className="btn soft"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    setDraft(await reviewBroadcast(draft.id));
                    setReviewed(true);
                    setConfirmed(false);
                  })
                }
              >
                Review draft
              </button>
              {reviewed && (
                <>
                  <p>Recipients: {draft.recipientCount}</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I confirm this audience and message
                  </label>
                  <button
                    className="btn gold"
                    disabled={busy || !confirmed}
                    onClick={() =>
                      action(async () => {
                        const b = await sendBroadcast(draft.id, draft.version);
                        setDraft(b);
                        setItems((x) =>
                          x.map((item) => (item.id === b.id ? b : item)),
                        );
                        setNotice(
                          `Broadcast sent to ${b.recipientCount} inboxes.`,
                        );
                        window.dispatchEvent(
                          new Event("notifications:refresh"),
                        );
                      })
                    }
                  >
                    Send broadcast
                  </button>
                </>
              )}
            </>
          )}
        </article>
      )}
      <div aria-label="Recent broadcasts">
        {items
          .filter((x) => x.id !== draft?.id)
          .map((b) => (
            <button
              key={b.id}
              className="btn soft"
              disabled={busy}
              onClick={() => {
                setDraft(b);
                setReviewed(false);
                setConfirmed(false);
                setNotice("");
              }}
            >
              {b.title} · {b.status}
            </button>
          ))}
      </div>
    </section>
  );
}
export function BroadcastPanel() {
  const [audiences, setAudiences] = useState([]),
    [selected, setSelected] = useState("");
  useEffect(() => {
    let live = true;
    getAccess()
      .then(async (access) => {
        const caps = access?.capabilities || [],
          global = caps.some(
            (x) => x.permission === "broadcasts.send" && x.scope === "",
          ),
          scopes = caps
            .filter(
              (x) => x.permission === "ministry.members.manage" && x.scope,
            )
            .map((x) => x.scope);
        if (!global && !scopes.length) return;
        const { groups } = await listGroups();
        const options = [
          ...(global ? [{ id: "", name: "All verified church accounts" }] : []),
          ...groups
            .filter((g) => global || scopes.includes(g.id))
            .map((g) => ({ id: g.id, name: g.name })),
        ];
        if (live) {
          setAudiences(options);
          setSelected(options[0]?.id || "");
        }
      })
      .catch(() => {
        if (live) setAudiences([]);
      });
    return () => {
      live = false;
    };
  }, []);
  if (!audiences.length) return null;
  return (
    <>
      <label>
        Broadcast audience
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {audiences.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <BroadcastAudience
        key={selected}
        groupId={selected}
        label={audiences.find((a) => a.id === selected)?.name}
      />
    </>
  );
}
