import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createPost } from "@/posts/api";
import PostsScreen from "@/screens/PostsScreen";
import EventsScreen from "@/screens/EventsScreen";
function GroupPostFeed({ groupId, refreshKey }) {
  const [authorized, setAuthorized] = useState(false);
  const [body, setBody] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Link className="group-content-back" to={`/groups/${groupId}`}>← Back to group</Link>
      <PostsScreen
        key={`${groupId}/${revision}/${refreshKey}`}
        groupId={groupId}
        onAccessChange={setAuthorized}
        composer={authorized ? (
          <form
            aria-label="Group post"
            className="group-post-composer"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await createPost({ body, groupId });
              setBody("");
              setRevision((x) => x + 1);
            } catch (e) {
              setError(e.message);
              if (e.status === 403 || e.status === 404) setAuthorized(false);
            } finally {
              setBusy(false);
            }
          }}
          >
            <div className="group-post-composer-heading">
              <div><p className="group-eyebrow">SHARE WITH YOUR GROUP</p><h2>Post an update</h2></div>
              <span>Active members only</span>
            </div>
            <label className="group-post-field">
              <span>What would you like to share?</span>
            <textarea
              aria-label="Group post text"
              required
              maxLength={5000}
              placeholder="Share an encouragement, update, or prayer…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            </label>
            <div className="group-post-composer-footer"><small>Your post will be visible to active members of this group.</small><button aria-label="Share with group" className="btn gold" disabled={busy}>{busy ? "Sharing…" : "Share update"}</button></div>
            {error && <p role="alert">{error}</p>}
          </form>
        ) : null}
      />
      {!authorized && error && <p role="alert">{error}</p>}
    </>
  );
}
export function GroupPostsScreen({ refreshKey = 0 }) {
  const { groupId } = useParams();
  return (
    <GroupPostFeed key={groupId} groupId={groupId} refreshKey={refreshKey} />
  );
}
export function GroupEventsScreen() {
  const { groupId } = useParams();
  return (
    <>
      <Link to={`/groups/${groupId}`}>Back to group</Link>
      <EventsScreen key={groupId} groupId={groupId} />
    </>
  );
}
