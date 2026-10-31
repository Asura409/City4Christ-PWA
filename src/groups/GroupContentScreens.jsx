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
      <Link to={`/groups/${groupId}`}>Back to group</Link>
      {authorized && (
        <form
          aria-label="Group post"
          className="auth-card"
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
          <p>Visible only to active members of this group.</p>
          <label>
            Group post text
            <textarea
              required
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button className="btn gold" disabled={busy}>
            Share with group
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
      {!authorized && error && <p role="alert">{error}</p>}
      <PostsScreen
        key={`${groupId}/${revision}/${refreshKey}`}
        groupId={groupId}
        onAccessChange={setAuthorized}
      />
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
