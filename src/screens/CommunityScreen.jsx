import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { listMembers } from "@/members/directoryApi";
import { listGroups } from "@/groups/api";
import { HomeCommunityPreview } from "@/posts/HomeCommunityPreview";

export default function CommunityScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("members");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { let live = true; Promise.all([listMembers({ limit: 8 }), listGroups()]).then(([memberPage, groupPage]) => { if (live) { setMembers(memberPage.members); setGroups(groupPage.groups || []); } }).catch((reason) => { if (live) setError(reason.message || "Could not load the community."); }); return () => { live = false; }; }, []);
  const filtered = members.filter((member) => `${member.firstName} ${member.lastName}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="screen active community-hub-screen" aria-label="Community"><header className="feature-hero community-hero"><p className="feature-eyebrow">CITY4CHRIST COMMUNITY</p><h1>Grow. Serve. Belong.</h1><p>Find people, ministries, fellowship, and conversations in one place.</p></header><div className="community-tabs" role="tablist" aria-label="Community sections"><button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Members</button><button className={tab === "ministries" ? "active" : ""} onClick={() => setTab("ministries")}>Ministries</button><button className={tab === "fellowship" ? "active" : ""} onClick={() => setTab("fellowship")}>Fellowship</button></div>{error && <p role="alert">{error}</p>}{tab === "members" && <section className="feature-panel community-section"><div className="community-section-heading"><div><h2>Meet the community</h2><p className="lead">Find a member and start a conversation.</p></div><button className="btn soft" onClick={() => navigate("/members")}>View all</button></div><input className="community-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members by name…" /><div className="community-member-grid">{filtered.map((member) => <article className="community-member-card" key={member.id}><Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatar?.url} size={48} /><strong>{member.firstName} {member.lastName}</strong><button className="btn soft" onClick={() => navigate("/chat")}>Message</button></article>)}</div></section>}{tab === "ministries" && <section className="feature-panel community-section"><div className="community-section-heading"><div><h2>Ministry groups</h2><p className="lead">Find a place to serve and grow.</p></div><button className="btn soft" onClick={() => navigate("/groups")}>View groups</button></div><div className="community-list">{groups.slice(0, 6).map((group) => <button key={group.id} onClick={() => navigate(`/groups/${group.id}`)}><strong>{group.name}</strong><span>{group.memberCount || 0} active members</span></button>)}</div></section>}{tab === "fellowship" && <section className="feature-panel community-section"><h2>Fellowship</h2><p className="lead">Share encouragement, prayer, and faith moments with the church.</p><button className="btn gold" onClick={() => navigate("/posts")}>Open community posts</button><HomeCommunityPreview /></section>}</section>;
}
