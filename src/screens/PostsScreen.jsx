import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { listPosts } from "@/posts/api";

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
          </article>;
        })}
      </div>
      {!loading && cursor && <button className="btn soft posts-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more posts"}</button>}
    </section>
  );
}
