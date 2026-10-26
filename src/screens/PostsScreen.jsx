import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { listPosts, removePostAmen, setPostAmen } from "@/posts/api";
import { safeUrl } from "@/lib/sanitize";

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PostsScreen({ refreshKey = 0 }) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reactionBusy, setReactionBusy] = useState({});

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
          return <article className="card community-post" key={post.id}>
            <div className="who"><Avatar name={author} size={42} /><div><b>{author}</b><span>{dateLabel(post.createdAt)} · Church</span></div></div>
            <p className="body">{post.body}</p>
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
            </div>
          </article>;
        })}
      </div>
      {!loading && cursor && <button className="btn soft posts-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more posts"}</button>}
    </section>
  );
}
