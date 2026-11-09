import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/lib/icons";
import { listPosts } from "./api";
import { safeUrl } from "@/lib/sanitize";

function authorName(post) {
  return [post.firstName, post.lastName].filter(Boolean).join(" ") || "Church member";
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, dateStyle: "medium" }).format(date);
}

export function HomeCommunityPreview() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    listPosts({ limit: 3, signal: controller.signal })
      .then(({ posts: next }) => setPosts(next))
      .catch((error) => { if (error.name !== "AbortError") setPosts([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <section className="home-community-preview" aria-label="Community highlights">
      <div className="home-community-heading">
        <div><span className="eyebrow">COMMUNITY HIGHLIGHTS</span><h2>Testimonies</h2></div>
        <button className="link" type="button" onClick={() => navigate("/posts")}>View all</button>
      </div>
      {loading ? <p className="home-community-muted">Loading community highlights…</p> : posts.length === 0 ? <div className="home-community-empty"><p>No community posts yet.</p><button className="btn soft" type="button" onClick={() => navigate("/posts")}>Visit Community</button></div> : <div className="home-community-list">
        {posts.map((post) => {
          const author = authorName(post);
          const image = post.attachments?.find((item) => item.contentType?.startsWith("image/"));
          const imageURL = image ? safeUrl(image.url) : "#";
          return <article className="home-community-card" key={post.id}>
            <div className="who"><Avatar name={author} size={38} /><div><strong>{author}</strong><small>{dateLabel(post.createdAt)}</small></div></div>
            {post.body && <p>{post.body.length > 180 ? `${post.body.slice(0, 180)}…` : post.body}</p>}
            {imageURL !== "#" && <img src={imageURL} alt="Community post attachment" loading="lazy" />}
            <div className="home-community-card-footer"><span><Icon name="heart" /> {post.amenCount || 0} Amen</span><span>{post.commentCount || 0} comments</span></div>
          </article>;
        })}
      </div>}
    </section>
  );
}
