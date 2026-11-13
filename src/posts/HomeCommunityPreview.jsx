import React from "react";
import { useNavigate } from "react-router-dom";
import PostsScreen from "../screens/PostsScreen";

export function HomeCommunityPreview({ refreshKey = 0 }) {
  const navigate = useNavigate();
  return <section className="home-community-preview" aria-label="Community highlights">
    <div className="home-community-heading">
      <div><span className="eyebrow">COMMUNITY HIGHLIGHTS</span><h2>Testimonies</h2></div>
      <button className="link" type="button" onClick={() => navigate("/posts")}>View all</button>
    </div>
    <PostsScreen embedded pageSize={3} refreshKey={refreshKey} />
  </section>;
}
