import React from "react";

export function PrayerComposer({
  idPrefix,
  compact = false,
  body,
  setBody,
  visibility,
  setVisibility,
  groupId,
  setGroupId,
  groups,
  groupsLoading,
  groupsError,
  anonymous,
  setAnonymous,
  submitting,
  onSubmit,
  submitLabel = "Share request",
}) {
  const groupUnavailable = visibility === "group" && (!groupId || groupsLoading || groups.length === 0);

  return (
    <form className={`prayer-v2-composer${compact ? " is-compact" : ""}`} aria-label="Share a prayer request" onSubmit={onSubmit}>
      <label htmlFor={`${idPrefix}-prayer-body`}>Your request</label>
      <textarea
        id={`${idPrefix}-prayer-body`}
        aria-label="Prayer request"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={3000}
        required
        placeholder="What would you like us to pray about?"
      />

      <label htmlFor={`${idPrefix}-prayer-visibility`}>Who can see this request?</label>
      <select
        id={`${idPrefix}-prayer-visibility`}
        value={visibility}
        onChange={(event) => { setVisibility(event.target.value); setGroupId(""); }}
      >
        <option value="community">Church community</option>
        <option value="group">One of my groups</option>
        <option value="private">Only me</option>
      </select>

      {visibility === "group" && (
        <div className="prayer-v2-group-choice">
          {groupsLoading ? (
            <p role="status">Loading your active groups…</p>
          ) : groupsError ? (
            <p className="prayer-v2-inline-error" role="alert">{groupsError}</p>
          ) : groups.length === 0 ? (
            <p className="prayer-v2-help">You need to be an active member of a group to share a group request.</p>
          ) : (
            <>
              <label htmlFor={`${idPrefix}-prayer-group`}>Group</label>
              <select
                id={`${idPrefix}-prayer-group`}
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
              >
                <option value="">Choose a group</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      <label className="prayer-v2-anonymous">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span><b>Post anonymously</b><small>Your identity stays hidden from other members. You can still manage your request.</small></span>
      </label>

      <button className="btn gold" type="submit" disabled={submitting || !body.trim() || groupUnavailable}>
        {submitting ? "Sharing…" : submitLabel}
      </button>
    </form>
  );
}
