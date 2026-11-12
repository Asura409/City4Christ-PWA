import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/lib/icons";
import { TimedMessage } from "@/components/TimedMessage";
import { useSession } from "@/auth/session";
import {
  createPostComment,
  deletePost,
  deletePostComment,
  getCommunityModerationAccess,
  listCommunityReports,
  listPostComments,
  listPosts,
  removePostAmen,
  reportCommunityContent,
  reviewCommunityReport,
  setPostAmen,
  updatePost,
} from "@/posts/api";
import { safeUrl } from "@/lib/sanitize";

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default function PostsScreen({
  refreshKey = 0,
  groupId = "",
  onAccessChange,
  composer = null,
}) {
  const { profile } = useSession();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reactionBusy, setReactionBusy] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentCursors, setCommentCursors] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [commentBusy, setCommentBusy] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [editingPostId, setEditingPostId] = useState("");
  const [postBusy, setPostBusy] = useState({});
  const [postErrors, setPostErrors] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [reportNotice, setReportNotice] = useState("");
  const [reportedTargets, setReportedTargets] = useState(() => new Set());
  const [reportBusy, setReportBusy] = useState({});
  const [reportErrors, setReportErrors] = useState({});
  const [moderationAllowed, setModerationAllowed] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationReports, setModerationReports] = useState([]);
  const [moderationCursor, setModerationCursor] = useState("");
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationBusy, setModerationBusy] = useState({});
  const [moderationReasons, setModerationReasons] = useState({});
  const [moderationError, setModerationError] = useState("");

  const load = useCallback(
    async (next = "", signal) => {
      try {
        setError("");
        if (next) setLoadingMore(true);
        else setLoading(true);
        const page = await listPosts({ cursor: next, signal, groupId });
        onAccessChange?.(true);
        setPosts((current) =>
          next ? [...current, ...page.posts] : page.posts,
        );
        setCursor(page.nextCursor);
      } catch (err) {
        if (err.name !== "AbortError") {
          onAccessChange?.(false);
          setPosts([]);
        }
        if (err.name !== "AbortError")
          setError(err.message || "Could not load the church feed.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId, onAccessChange],
  );

  const toggleAmen = async (post) => {
    if (reactionBusy[post.id]) return;
    const nextReacted = !post.reacted;
    setReactionBusy((current) => ({ ...current, [post.id]: true }));
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              reacted: nextReacted,
              amenCount: Math.max(0, (item.amenCount || 0) + (nextReacted ? 1 : -1)),
            }
          : item,
      ),
    );
    try {
      const state = post.reacted
        ? await removePostAmen(post.id)
        : await setPostAmen(post.id);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, amenCount: state.amenCount, reacted: state.reacted }
            : item,
        ),
      );
    } catch (err) {
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, amenCount: post.amenCount || 0, reacted: Boolean(post.reacted) }
            : item,
        ),
      );
      setError(err.message || "Could not update your Amen reaction.");
    } finally {
      setReactionBusy((current) => ({ ...current, [post.id]: false }));
    }
  };

  const loadComments = async (postId, cursor = "") => {
    setCommentLoading((current) => ({ ...current, [postId]: true }));
    setCommentErrors((current) => ({ ...current, [postId]: "" }));
    try {
      const page = await listPostComments(postId, { cursor });
      setComments((current) => ({
        ...current,
        [postId]: cursor
          ? [...(current[postId] || []), ...page.comments]
          : page.comments,
      }));
      setCommentCursors((current) => ({
        ...current,
        [postId]: page.nextCursor,
      }));
    } catch (err) {
      setCommentErrors((current) => ({
        ...current,
        [postId]: err.message || "Could not load comments.",
      }));
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }));
    }
  };

  function closePostOptions(event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  function openReport(type, item, postId) {
    const key = `${type}:${item.id}`;
    setReportTarget({ type, id: item.id, postId, content: item.body, key });
    setReportErrors((current) => ({ ...current, [key]: "" }));
  }

  useEffect(() => {
    if (!reportTarget) return undefined;
    const previous = document.activeElement;
    document.body.classList.add("post-report-open");
    function onKeyDown(event) {
      if (event.key === "Escape") setReportTarget(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("post-report-open");
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [reportTarget]);

  const toggleComments = async (post) => {
    if (expandedComments[post.id]) {
      setExpandedComments((current) => ({ ...current, [post.id]: false }));
      return;
    }
    setExpandedComments((current) => ({ ...current, [post.id]: true }));
    const reveal = () => requestAnimationFrame(() => {
      document.getElementById(`comments-${post.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    reveal();
    if (!Object.hasOwn(comments, post.id)) await loadComments(post.id);
    reveal();
  };

  const submitComment = async (post, event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get("body");
    if (commentBusy[post.id] || typeof body !== "string" || !body.trim())
      return;
    setCommentBusy((current) => ({ ...current, [post.id]: true }));
    setCommentErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      const comment = await createPostComment(post.id, body);
      setComments((current) => ({
        ...current,
        [post.id]: [comment, ...(current[post.id] || [])],
      }));
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, commentCount: (item.commentCount || 0) + 1 }
            : item,
        ),
      );
      form.reset();
    } catch (err) {
      setCommentErrors((current) => ({
        ...current,
        [post.id]: err.message || "Could not add your comment.",
      }));
    } finally {
      setCommentBusy((current) => ({ ...current, [post.id]: false }));
    }
  };

  const removeComment = async (post, comment) => {
    if (commentBusy[comment.id]) return;
    setCommentBusy((current) => ({ ...current, [comment.id]: true }));
    setCommentErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      await deletePostComment(post.id, comment.id);
      setComments((current) => ({
        ...current,
        [post.id]: (current[post.id] || []).filter(
          (item) => item.id !== comment.id,
        ),
      }));
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                commentCount: Math.max(0, (item.commentCount || 0) - 1),
              }
            : item,
        ),
      );
    } catch (err) {
      setCommentErrors((current) => ({
        ...current,
        [post.id]: err.message || "Could not delete your comment.",
      }));
    } finally {
      setCommentBusy((current) => ({ ...current, [comment.id]: false }));
    }
  };

  const savePost = async (post, event) => {
    event.preventDefault();
    const body = new FormData(event.currentTarget).get("body");
    if (postBusy[post.id] || typeof body !== "string" || !body.trim()) return;
    setPostBusy((current) => ({ ...current, [post.id]: true }));
    setPostErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      const attachmentIds = (post.attachments || []).map((item) => item.id);
      const updated = await updatePost(post.id, body, attachmentIds);
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? updated : item)),
      );
      setEditingPostId("");
    } catch (err) {
      setPostErrors((current) => ({
        ...current,
        [post.id]: err.message || "Could not update your post.",
      }));
    } finally {
      setPostBusy((current) => ({ ...current, [post.id]: false }));
    }
  };

  const removePost = async (post) => {
    if (postBusy[post.id]) return;
    setPostBusy((current) => ({ ...current, [post.id]: true }));
    setPostErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      await deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setComments((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      setEditingPostId("");
      setConfirmDeleteId("");
    } catch (err) {
      setPostErrors((current) => ({
        ...current,
        [post.id]: err.message || "Could not delete your post.",
      }));
    } finally {
      setPostBusy((current) => ({ ...current, [post.id]: false }));
    }
  };

  const submitReport = async (targetType, targetId, event) => {
    event.preventDefault();
    const key = `${targetType}:${targetId}`;
    if (reportBusy[key]) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setReportBusy((current) => ({ ...current, [key]: true }));
    setReportErrors((current) => ({ ...current, [key]: "" }));
    try {
      await reportCommunityContent(
        targetType,
        targetId,
        values.get("reason"),
        values.get("details"),
      );
      setReportedTargets((current) => new Set(current).add(key));
      setReportTarget(null);
      setReportNotice("Report submitted for review.");
      if (moderationOpen && moderationAllowed) void loadModerationReports();
      form.reset();
    } catch (err) {
      setReportErrors((current) => ({
        ...current,
        [key]: err.message || "Could not send this report.",
      }));
    } finally {
      setReportBusy((current) => ({ ...current, [key]: false }));
    }
  };

  const loadModerationReports = async (cursor = "") => {
    setModerationLoading(true);
    setModerationError("");
    try {
      const page = await listCommunityReports({ cursor, groupId });
      setModerationReports((current) =>
        cursor ? [...current, ...page.reports] : page.reports,
      );
      setModerationCursor(page.nextCursor);
      setModerationOpen(true);
    } catch (err) {
      setModerationError(err.message || "Could not load community reports.");
    } finally {
      setModerationLoading(false);
    }
  };

  const reviewReport = async (report, decision) => {
    const reason = (moderationReasons[report.id] || "").trim();
    if (!reason || moderationBusy[report.id]) return;
    setModerationBusy((current) => ({ ...current, [report.id]: true }));
    setModerationError("");
    try {
      await reviewCommunityReport(report.id, decision, reason);
      setModerationReports((current) =>
        current.filter(
          (item) =>
            item.id !== report.id &&
            !(decision === "hide" && item.postId === report.postId),
        ),
      );
      if (decision === "hide") {
        if (report.targetType === "post") {
          setPosts((current) =>
            current.filter((item) => item.id !== report.postId),
          );
          setComments((current) => {
            const next = { ...current };
            delete next[report.postId];
            return next;
          });
        } else {
          setComments((current) => ({
            ...current,
            [report.postId]: (current[report.postId] || []).filter(
              (item) => item.id !== report.targetId,
            ),
          }));
          setPosts((current) =>
            current.map((item) =>
              item.id === report.postId
                ? {
                    ...item,
                    commentCount: Math.max(0, (item.commentCount || 0) - 1),
                  }
                : item,
            ),
          );
        }
      }
    } catch (err) {
      setModerationError(err.message || "Could not review this report.");
    } finally {
      setModerationBusy((current) => ({ ...current, [report.id]: false }));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setPosts([]);
    setCursor("");
    void load("", controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  useEffect(() => {
    let current = true;
    getCommunityModerationAccess()
      .then((access) => {
        if (current)
          setModerationAllowed(
            (access.capabilities || []).some(
              (item) =>
                item.permission === "groups.content.moderate" &&
                (item.scope === "" || (groupId && item.scope === groupId)),
            ),
          );
      })
      .catch(() => {
        if (current) setModerationAllowed(false);
      });
    return () => {
      current = false;
    };
  }, [groupId, onAccessChange]);

  return (
    <section
      className="screen active posts-screen"
      aria-label="Church community"
    >
      <div className="posts-heading">
        <div>
          <p className="group-eyebrow">CITY4CHRIST COMMUNITY</p>
          <h1>{groupId ? "Group community" : "Church community"}</h1>
        </div>
        <p className="lead">Share encouragement and updates with the church.</p>
      </div>
      <TimedMessage message={reportNotice} />
      {error && (
        <div className="posts-error" role="alert">
          <span>{error}</span>
          <button className="btn soft" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {moderationAllowed && (
        <section
          className="community-moderation"
          aria-label="Community moderation"
        >
          <button
            className="btn soft"
            type="button"
            aria-expanded={moderationOpen}
            onClick={() =>
              moderationOpen
                ? setModerationOpen(false)
                : void loadModerationReports()
            }
          >
            {moderationLoading
              ? "Loading reports…"
              : moderationOpen
                ? "Hide report queue"
                : "Review reported content"}
          </button>
          {moderationError && (
            <p className="post-report-error" role="alert">
              {moderationError}
            </p>
          )}
          {moderationOpen && (
            <div
              className="community-report-queue"
              aria-label="Pending community reports"
            >
              {moderationReports.length === 0 && (
                <p className="post-comments-empty">No pending reports.</p>
              )}
              {moderationReports.map((report) => (
                <article className="community-report-card" key={report.id}>
                  <p className="group-eyebrow">REPORTED {report.targetType}</p>
                  <p className="community-report-content">{report.content}</p>
                  <p>
                    <b>Reason:</b> {report.reason}
                    {report.details ? ` · ${report.details}` : ""}
                  </p>
                  <label htmlFor={`moderation-reason-${report.id}`}>
                    Decision reason
                  </label>
                  <textarea
                    id={`moderation-reason-${report.id}`}
                    value={moderationReasons[report.id] || ""}
                    maxLength={500}
                    required
                    placeholder="Explain why you are hiding or dismissing this report."
                    onChange={(event) =>
                      setModerationReasons((current) => ({
                        ...current,
                        [report.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="post-editor-actions">
                    <button
                      className="btn danger"
                      type="button"
                      disabled={
                        Boolean(moderationBusy[report.id]) ||
                        !(moderationReasons[report.id] || "").trim()
                      }
                      onClick={() => void reviewReport(report, "hide")}
                    >
                      {moderationBusy[report.id] ? "Saving…" : "Hide content"}
                    </button>
                    <button
                      className="btn soft"
                      type="button"
                      disabled={
                        Boolean(moderationBusy[report.id]) ||
                        !(moderationReasons[report.id] || "").trim()
                      }
                      onClick={() => void reviewReport(report, "dismiss")}
                    >
                      Dismiss report
                    </button>
                  </div>
                </article>
              ))}
              {moderationCursor && (
                <button
                  className="btn soft"
                  type="button"
                  disabled={moderationLoading}
                  onClick={() => void loadModerationReports(moderationCursor)}
                >
                  Load older reports
                </button>
              )}
              <button
                className="btn soft"
                type="button"
                disabled={moderationLoading}
                onClick={() => void loadModerationReports()}
              >
                Refresh reports
              </button>
            </div>
          )}
        </section>
      )}
      {composer}
      {loading && (
        <p className="posts-state" role="status">
          Loading posts…
        </p>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="empty">
          No posts yet. Share the first update with your church.
        </div>
      )}
      <div className="posts-feed">
        {posts.map((post) => {
          const author =
            [post.firstName, post.lastName].filter(Boolean).join(" ") ||
            "Church member";
          const isAuthor = profile?.id === post.authorId;
          return (
            <article className="card community-post" key={post.id}>
              <div className="who post-head">
                <Avatar name={author} src={post.avatar?.url} size={42} />
                <div>
                  <b>{author}</b>
                  <span>{dateLabel(post.createdAt)} · Church</span>
                </div>
                <details className="post-options">
                  <summary aria-label="Post options">⋯</summary>
                  <div className="post-options-menu">
                    {isAuthor ? (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            closePostOptions(event);
                            setEditingPostId(post.id);
                            setConfirmDeleteId("");
                            setPostErrors((current) => ({ ...current, [post.id]: "" }));
                          }}
                        >
                          Edit post
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            closePostOptions(event);
                            setConfirmDeleteId(post.id);
                            setEditingPostId("");
                            setPostErrors((current) => ({ ...current, [post.id]: "" }));
                          }}
                        >
                          Delete post
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={reportedTargets.has(`post:${post.id}`)}
                        onClick={(event) => {
                          closePostOptions(event);
                          openReport("post", post, post.id);
                        }}
                      >
                        {reportedTargets.has(`post:${post.id}`) ? "Post reported" : "Report post"}
                      </button>
                    )}
                  </div>
                </details>
              </div>
              {postErrors[post.id] && (
                <p className="post-manage-error" role="alert">
                  {postErrors[post.id]}
                </p>
              )}
              {editingPostId === post.id ? (
                <form
                  className="post-editor"
                  onSubmit={(event) => void savePost(post, event)}
                >
                  <label htmlFor={`edit-post-${post.id}`}>Edit post</label>
                  <textarea
                    id={`edit-post-${post.id}`}
                    name="body"
                    maxLength={5000}
                    required
                    defaultValue={post.body}
                  />
                  <div className="post-editor-actions">
                    <button
                      className="btn primary"
                      type="submit"
                      disabled={Boolean(postBusy[post.id])}
                    >
                      {postBusy[post.id] ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      className="btn soft"
                      type="button"
                      disabled={Boolean(postBusy[post.id])}
                      onClick={() => setEditingPostId("")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="body">{post.body}</p>
              )}
              {confirmDeleteId === post.id && (
                <div
                  className="post-delete-confirmation"
                  role="group"
                  aria-label="Delete post confirmation"
                >
                  <p>Delete this post and its comments?</p>
                  <button
                    className="btn danger"
                    type="button"
                    disabled={Boolean(postBusy[post.id])}
                    onClick={() => void removePost(post)}
                  >
                    {postBusy[post.id] ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    className="btn soft"
                    type="button"
                    disabled={Boolean(postBusy[post.id])}
                    onClick={() => setConfirmDeleteId("")}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {post.attachments?.length > 0 && (
                <div className="post-media">
                  {post.attachments.map((item) => {
                    const url = safeUrl(item.url);
                    if (url === "#") return null;
                    if (item.contentType?.startsWith("image/"))
                      return (
                        <img
                          key={item.id}
                          src={url}
                          alt="Church post attachment"
                          loading="lazy"
                        />
                      );
                    if (item.contentType?.startsWith("audio/"))
                      return (
                        <audio
                          key={item.id}
                          src={url}
                          controls
                          preload="metadata"
                          aria-label="Audio attachment"
                        />
                      );
                    if (item.contentType?.startsWith("video/"))
                      return (
                        <video
                          key={item.id}
                          src={url}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label="Video attachment"
                        />
                      );
                    return null;
                  })}
                </div>
              )}
              <div className="post-actions">
                <button
                  className={`post-icon-btn${post.reacted ? " is-active" : ""}`}
                  type="button"
                  aria-pressed={Boolean(post.reacted)}
                  aria-label={post.reacted ? `Remove Amen (${post.amenCount || 0})` : `Say Amen (${post.amenCount || 0})`}
                  disabled={Boolean(reactionBusy[post.id])}
                  onClick={() => void toggleAmen(post)}
                >
                  <Icon name="heart" fill={Boolean(post.reacted)} />
                  <span className="post-action-count">{post.amenCount || 0}</span>
                </button>
                <button
                  className="post-icon-btn"
                  type="button"
                  aria-expanded={Boolean(expandedComments[post.id])}
                  aria-label={expandedComments[post.id]
                    ? `Hide comments (${post.commentCount || 0})`
                    : `View comments (${post.commentCount || 0})`}
                  onClick={() => void toggleComments(post)}
                >
                  <Icon name="comment" />
                  <span className="post-action-count">{post.commentCount || 0}</span>
                </button>
              </div>
              {expandedComments[post.id] && (
                <section
                  id={`comments-${post.id}`}
                  className="post-comments"
                  aria-label={`Comments on ${author}'s post`}
                >
                  {commentErrors[post.id] && (
                    <p className="post-comment-error" role="alert">
                      {commentErrors[post.id]}
                    </p>
                  )}
                  {commentLoading[post.id] && (
                    <p role="status">Loading comments…</p>
                  )}
                  {!commentLoading[post.id] &&
                    (comments[post.id] || []).length === 0 && (
                      <p className="post-comments-empty">
                        No comments yet. Start the conversation.
                      </p>
                    )}
                  <div className="post-comment-list">
                    {(comments[post.id] || []).map((item) => {
                      const commenter =
                        [item.firstName, item.lastName]
                          .filter(Boolean)
                          .join(" ") || "Church member";
                      return (
                        <article className="post-comment" key={item.id}>
                          <div className="post-comment-header">
                            <Avatar name={commenter} src={item.avatar?.url} size={32} />
                            <div>
                              <b>{commenter}</b>
                              <span>{dateLabel(item.createdAt)}</span>
                            </div>
                            {profile?.id === item.authorId && (
                              <button
                                type="button"
                                className="post-comment-delete"
                                disabled={Boolean(commentBusy[item.id])}
                                onClick={() => void removeComment(post, item)}
                              >
                                Delete comment
                              </button>
                            )}
                            {profile?.id !== item.authorId && (
                              <button
                                type="button"
                                className="post-comment-delete"
                                disabled={reportedTargets.has(
                                  `comment:${item.id}`,
                                )}
                                onClick={() => openReport("comment", item, post.id)}
                              >
                                {reportedTargets.has(`comment:${item.id}`)
                                  ? "Reported"
                                  : "Report comment"}
                              </button>
                            )}
                          </div>
                          <p>{item.body}</p>
                        </article>
                      );
                    })}
                  </div>
                  {commentCursors[post.id] && (
                    <button
                      type="button"
                      className="btn soft post-comments-more"
                      disabled={Boolean(commentLoading[post.id])}
                      onClick={() =>
                        void loadComments(post.id, commentCursors[post.id])
                      }
                    >
                      Load more comments
                    </button>
                  )}
                  <form
                    className="post-comment-form"
                    onSubmit={(event) => void submitComment(post, event)}
                  >
                    <Avatar
                      name={[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "You"}
                      src={profile?.avatar?.url}
                      size={32}
                    />
                    <label className="post-comment-label" htmlFor={`comment-${post.id}`}>
                      Write a comment
                    </label>
                    <textarea
                      id={`comment-${post.id}`}
                      name="body"
                      rows={1}
                      maxLength={2000}
                      required
                      placeholder="Add a comment…"
                    />
                    <button
                      className="post-comment-submit"
                      type="submit"
                      aria-label="Comment"
                      disabled={Boolean(commentBusy[post.id])}
                    >
                      {commentBusy[post.id] ? "Posting…" : "Post"}
                    </button>
                  </form>
                </section>
              )}
            </article>
          );
        })}
      </div>
      {!loading && cursor && (
        <button
          className="btn soft posts-more"
          disabled={loadingMore}
          onClick={() => void load(cursor)}
        >
          {loadingMore ? "Loading…" : "Load more posts"}
        </button>
      )}
      {reportTarget && (
        <div className="post-report-modal" role="presentation" onClick={() => setReportTarget(null)}>
          <section
            className="post-report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="post-report-head">
              <h2 id="post-report-title">Report {reportTarget.type}</h2>
              <button
                type="button"
                className="post-report-close"
                aria-label="Close report"
                autoFocus
                onClick={() => setReportTarget(null)}
              >
                ×
              </button>
            </header>
            <p className="post-report-snippet">{reportTarget.content}</p>
            <form
              key={reportTarget.key}
              className="post-report-form"
              onSubmit={(event) => void submitReport(reportTarget.type, reportTarget.id, event)}
            >
              <label htmlFor="post-report-reason">
                Why are you reporting this {reportTarget.type}?
              </label>
              <select id="post-report-reason" name="reason" defaultValue="other">
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="hate">Hateful content</option>
                <option value="threats">Threats</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="post-report-details">More details (optional)</label>
              <textarea
                id="post-report-details"
                name="details"
                maxLength={1000}
                placeholder="Add details for the moderation team (optional)."
              />
              {reportErrors[reportTarget.key] && (
                <p className="post-report-error" role="alert">
                  {reportErrors[reportTarget.key]}
                </p>
              )}
              <div className="post-report-actions">
                <button className="btn soft" type="button" onClick={() => setReportTarget(null)}>Cancel</button>
                <button className="btn primary" type="submit" disabled={Boolean(reportBusy[reportTarget.key])}>
                  {reportBusy[reportTarget.key] ? "Sending…" : "Send report"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
