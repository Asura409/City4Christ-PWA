import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { listMembers } from "@/members/directoryApi";
import "@/members/member-directory.css";

export default function MemberDirectoryScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const page = await listMembers({ query, signal: controller.signal });
        setMembers(page.members);
        setCursor(page.nextCursor);
      } catch (reason) {
        if (reason.name !== "AbortError") setError(reason.message || "Could not load members.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await listMembers({ query, cursor });
      setMembers((current) => [...current, ...page.members]);
      setCursor(page.nextCursor);
    } catch (reason) {
      setError(reason.message || "Could not load more members.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="screen active member-directory-screen" aria-label="Member directory">
      <div className="member-directory-heading">
        <div><p className="group-eyebrow">CITY4CHRIST COMMUNITY</p><h1>Members</h1><p className="lead">Find and connect with people in the church.</p></div>
      </div>
      <div className="member-directory-search">
        <label htmlFor="member-directory-search">Search members</label>
        <div><input id="member-directory-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name…" autoComplete="off" />{query && <button type="button" className="btn soft" onClick={() => setQuery("")}>Clear</button>}</div>
      </div>
      {error && <p className="member-directory-error" role="alert">{error}</p>}
      {loading && <p className="member-directory-state" role="status">Loading members…</p>}
      {!loading && !error && members.length === 0 && <p className="member-directory-state">No members found.</p>}
      {!loading && members.length > 0 && <div className="member-directory-grid">
        {members.map((member) => <article className="member-directory-card" key={member.id}>
          <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatar?.url} size={58} />
          <div><h2>{member.firstName} {member.lastName}</h2><p>City4Christ member</p></div>
          <button className="btn soft" type="button" onClick={() => navigate("/chat")}>Message</button>
        </article>)}
      </div>}
      {cursor && !loading && <button className="btn dark member-directory-more" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more members"}</button>}
    </section>
  );
}
