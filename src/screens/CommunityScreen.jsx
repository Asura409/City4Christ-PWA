import React from "react";
import { useNavigate } from "react-router-dom";
import MessagesScreen from "@/screens/MessagesScreen";

export default function CommunityScreen() {
  const navigate = useNavigate();
  return (
    <section className="screen active community-hub-screen community-chat-screen" aria-label="Community">
      <header className="feature-hero community-hero">
        <div>
          <p className="feature-eyebrow">CITY4CHRIST COMMUNITY</p>
          <h1>Community chats</h1>
          <p>Connect with members, groups, and ministries in one shared space.</p>
        </div>
        <div className="community-resource-links" aria-label="Community resources">
          <button className="btn gold" type="button" onClick={() => navigate("/posts")}>Community posts</button>
          <button className="btn soft" type="button" onClick={() => navigate("/members")}>Members</button>
          <button className="btn soft" type="button" onClick={() => navigate("/groups")}>Groups</button>
        </div>
      </header>
      <MessagesScreen embedded />
    </section>
  );
}
