import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("sermons");
  return <section className="screen active search-screen" aria-label="Search City4Christ">
    <h1>Search City4Christ</h1>
    <p>Find a sermon by title, speaker or topic, or look up a church member.</p>
    <form className="platform-search" role="search" aria-label="Search City4Christ" onSubmit={(event) => {
      event.preventDefault();
      if (query.trim()) navigate(`${category === "sermons" ? "/word" : "/members"}?${new URLSearchParams({ q: query.trim() })}`);
    }}>
      <label>Search in<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="sermons">Sermons</option><option value="members">Members</option></select></label>
      <label>Search terms<input type="search" autoFocus required maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={category === "sermons" ? "Title, speaker or topic…" : "Member name…"} /></label>
      <button className="btn gold" disabled={!query.trim()}>Search</button>
    </form>
  </section>;
}
