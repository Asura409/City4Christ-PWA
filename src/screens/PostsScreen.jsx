import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/auth/session";
import { createPostComment, deletePost, deletePostComment, listPostComments, listPosts, removePostAmen, setPostAmen, updatePost } from "@/posts/api";
import { safeUrl } from "@/lib/sanitize";

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PostsScreen({ refreshKey = 0 }) {
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

  const load = useCallback(async (next = "", signal) => {
    try {
      setError("");
      if (next) setLoadingMore(true); else setLoading(true);
      const page = await listPosts({ cursor: next, signal });
      setPosts((current) => next ? [...current, ...page.posts] : page.posts);
      setCursor(page.nextCursor);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Could not load the church feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const toggleAmen = async (post) => {
    if (reactionBusy[post.id]) return;
    setReactionBusy((current) => ({ ...current, [post.id]: true }));
    try {
      const state = post.reacted ? await removePostAmen(post.id) : await setPostAmen(post.id);
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, amenCount: state.amenCount, reacted: state.reacted }
        : item));
    } catch (err) {
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
      setComments((current) => ({ ...current, [postId]: cursor ? [...(current[postId] || []), ...page.comments] : page.comments }));
      setCommentCursors((current) => ({ ...current, [postId]: page.nextCursor }));
    } catch (err) {
      setCommentErrors((current) => ({ ...current, [postId]: err.message || "Could not load comments." }));
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }));
    }
  };

  const toggleComments = async (post) => {
    if (expandedComments[post.id]) {
      setExpandedComments((current) => ({ ...current, [post.id]: false }));
      return;
    }
    setExpandedComments((current) => ({ ...current, [post.id]: true }));
    if (!Object.hasOwn(comments, post.id)) await loadComments(post.id);
  };

  const submitComment = async (post, event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get("body");
    if (commentBusy[post.id] || typeof body !== "string" || !body.trim()) return;
    setCommentBusy((current) => ({ ...current, [post.id]: true }));
    setCommentErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      const comment = await createPostComment(post.id, body);
      setComments((current) => ({ ...current, [post.id]: [comment, ...(current[post.id] || [])] }));
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: (item.commentCount || 0) + 1 } : item));
      form.reset();
    } catch (err) {
      setCommentErrors((current) => ({ ...current, [post.id]: err.message || "Could not add your comment." }));
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
      setComments((current) => ({ ...current, [post.id]: (current[post.id] || []).filter((item) => item.id !== comment.id) }));
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: Math.max(0, (item.commentCount || 0) - 1) } : item));
    } catch (err) {
      setCommentErrors((current) => ({ ...current, [post.id]: err.message || "Could not delete your comment." }));
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
      setPosts((current) => current.map((item) => item.id === post.id ? updated : item));
      setEditingPostId("");
    } catch (err) {
      setPostErrors((current) => ({ ...current, [post.id]: err.message || "Could not update your post." }));
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
      setComments((current) => { const next = { ...current }; delete next[post.id]; return next; });
      setEditingPostId("");
      setConfirmDeleteId("");
    } catch (err) {
      setPostErrors((current) => ({ ...current, [post.id]: err.message || "Could not delete your post." }));
    } finally {
      setPostBusy((current) => ({ ...current, [post.id]: false }));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setPosts([]);
    setCursor("");
    void load("", controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  return (
    <section className="screen active posts-screen" aria-label="Church community">
      <div className="posts-heading">
        <div><p className="group-eyebrow">CITY4CHRIST COMMUNITY</p><h1>Church community</h1></div>
        <p className="lead">Share encouragement and updates with the church.</p>
      </div>
      {error && <div className="posts-error" role="alert"><span>{error}</span><button className="btn soft" onClick={() => void load()}>Try again</button></div>}
      {loading && <p className="posts-state" role="status">Loading posts…</p>}
      {!loading && !error && posts.length === 0 && <div className="empty">No posts yet. Share the first update with your church.</div>}
      <div className="posts-feed">
        {posts.map((post) => {
          const author = [post.firstName, post.lastName].filter(Boolean).join(" ") || "Church member";
          const isAuthor = profile?.id === post.authorId;
          return <article className="card community-post" key={post.id}>
            <div className="who"><Avatar name={author} size={42} /><div><b>{author}</b><span>{dateLabel(post.createdAt)} · Church</span></div></div>
            {isAuthor && <div className="post-manage-actions">
              <button className="btn soft" type="button" onClick={() => { setEditingPostId(post.id); setConfirmDeleteId(""); setPostErrors((current) => ({ ...current, [post.id]: "" })); }}>Edit post</button>
              <button className="btn soft" type="button" onClick={() => { setConfirmDeleteId(post.id); setEditingPostId(""); setPostErrors((current) => ({ ...current, [post.id]: "" })); }}>Delete post</button>
            </div>}
            {postErrors[post.id] && <p className="post-manage-error" role="alert">{postErrors[post.id]}</p>}
            {editingPostId === post.id ? <form className="post-editor" onSubmit={(event) => void savePost(post, event)}>
              <label htmlFor={`edit-post-${post.id}`}>Edit post</label>
              <textarea id={`edit-post-${post.id}`} name="body" maxLength={5000} required defaultValue={post.body} />
              <div className="post-editor-actions">
                <button className="btn primary" type="submit" disabled={Boolean(postBusy[post.id])}>{postBusy[post.id] ? "Saving…" : "Save changes"}</button>
                <button className="btn soft" type="button" disabled={Boolean(postBusy[post.id])} onClick={() => setEditingPostId("")}>Cancel</button>
              </div>
            </form> : <p className="body">{post.body}</p>}
            {confirmDeleteId === post.id && <div className="post-delete-confirmation" role="group" aria-label="Delete post confirmation">
              <p>Delete this post and its comments?</p>
              <button className="btn danger" type="button" disabled={Boolean(postBusy[post.id])} onClick={() => void removePost(post)}>{postBusy[post.id] ? "Deleting…" : "Confirm delete"}</button>
              <button className="btn soft" type="button" disabled={Boolean(postBusy[post.id])} onClick={() => setConfirmDeleteId("")}>Cancel</button>
            </div>}
            {post.attachments?.length > 0 && <div className="post-media">{post.attachments.map((item) => {
              const url = safeUrl(item.url);
              if (url === "#") return null;
              if (item.contentType?.startsWith("image/")) return <img key={item.id} src={url} alt="Church post attachment" loading="lazy" />;
              if (item.contentType?.startsWith("audio/")) return <audio key={item.id} src={url} controls preload="metadata" aria-label="Audio attachment" />;
              if (item.contentType?.startsWith("video/")) return <video key={item.id} src={url} controls playsInline preload="metadata" aria-label="Video attachment" />;
              return null;
            })}</div>}
            <div className="post-actions">
              <button className={`btn soft post-amen${post.reacted ? " is-active" : ""}`} type="button" aria-pressed={Boolean(post.reacted)} disabled={Boolean(reactionBusy[post.id])} onClick={() => void toggleAmen(post)}>
                {post.reacted ? `Remove Amen (${post.amenCount || 0})` : `Say Amen (${post.amenCount || 0})`}
              </button>
              <button className="btn soft post-comments-toggle" type="button" aria-expanded={Boolean(expandedComments[post.id])} onClick={() => void toggleComments(post)}>
                {expandedComments[post.id] ? `Hide comments (${post.commentCount || 0})` : `View comments (${post.commentCount || 0})`}
              </button>
            </div>
            {expandedComments[post.id] && <section className="post-comments" aria-label={`Comments on ${author}'s post`}>
              {commentErrors[post.id] && <p className="post-comment-error" role="alert">{commentErrors[post.id]}</p>}
              {commentLoading[post.id] && <p role="status">Loading comments…</p>}
              {!commentLoading[post.id] && (comments[post.id] || []).length === 0 && <p className="post-comments-empty">No comments yet. Start the conversation.</p>}
              <div className="post-comment-list">{(comments[post.id] || []).map((item) => {
                const commenter = [item.firstName, item.lastName].filter(Boolean).join(" ") || "Church member";
                return <article className="post-comment" key={item.id}>
                  <div className="post-comment-header"><div><b>{commenter}</b><span>{dateLabel(item.createdAt)}</span></div>
                    {profile?.id === item.authorId && <button type="button" className="post-comment-delete" disabled={Boolean(commentBusy[item.id])} onClick={() => void removeComment(post, item)}>Delete comment</button>}
                  </div>
                  <p>{item.body}</p>
                </article>;
              })}</div>
              {commentCursors[post.id] && <button type="button" className="btn soft post-comments-more" disabled={Boolean(commentLoading[post.id])} onClick={() => void loadComments(post.id, commentCursors[post.id])}>Load more comments</button>}
              <form className="post-comment-form" onSubmit={(event) => void submitComment(post, event)}>
                <label htmlFor={`comment-${post.id}`}>Write a comment</label>
                <textarea id={`comment-${post.id}`} name="body" maxLength={2000} required placeholder="Share a thoughtful reply…" />
                <button className="btn primary" type="submit" disabled={Boolean(commentBusy[post.id])}>{commentBusy[post.id] ? "Posting…" : "Comment"}</button>
              </form>
            </section>}
          </article>;
        })}
      </div>
      {!loading && cursor && <button className="btn soft posts-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more posts"}</button>}
    </section>
  );
}
