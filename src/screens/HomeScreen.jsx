import React from "react";
import { useNavigate } from "react-router-dom";
import { DailyVerseCard } from "@/dailyverse/DailyVerseCard";
import { Icon } from "@/lib/icons";
import { useSession } from "@/auth/session";
import { HomeCommunityPreview } from "@/posts/HomeCommunityPreview";
export default function HomeScreen() {
  const { profile } = useSession(),
    navigate = useNavigate();
  return (
    <section className="screen active" aria-label="Home">
      <section className="welcome-card fade-up">
        <h1>Welcome, {profile.firstName} 🙏</h1>
        <p>Welcome back to your faith community</p>
      </section>
      <section className="banner-card fade-up">
        <img src="/assets/images/banner.jpeg" alt="City4Christ event" />
        <div className="banner-overlay">
          <h2>2026 Year of Enlargement</h2>
          <button className="reference-gold-btn" type="button" onClick={() => navigate("/events")}>View Programme</button>
        </div>
      </section>
      <DailyVerseCard />
      <div className="reference-quick-links">
        {[
          ["/events", "cal", "Events", "See upcoming gatherings"],
          ["/pastors", "users", "Book Pastor", "Request pastoral care"],
          ["/giving", "heart", "Giving", "Tithe, offering & more"],
          ["/word", "book", "Word", "Sermons and media"],
          ["/prayer", "flame", "Prayer", "Pray with the community"],
          ["/groups", "users", "Groups", "Find your ministry group"],
          ["/bible", "book", "Bible", "Read the Word together"],
          ["/community", "chat", "Community", "Find people and ministries"],
          ["/live", "play", "Live", "Join worship online"],
          ["/chat", "chat", "Messages", "Stay connected with members"],
          ["/members", "users", "Members", "Find people in the church"],
          ["/get-app", "download", "Get the App", "Keep City4Christ close"],
        ].map(([path, icon, label, description]) => (
          <button key={path} className="reference-quick-card" type="button" onClick={() => navigate(path)}>
            <span className="reference-quick-icon"><Icon name={icon} /></span>
            <strong>{label}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
      <HomeCommunityPreview />
      <button className="home-giving" type="button" onClick={() => navigate("/giving")}>
        <span className="home-giving-icon"><Icon name="heart" fill /></span>
        <span className="home-giving-copy"><b>Give to City4Christ</b><small>Support the church through Give A Little</small></span>
        <Icon name="next" />
      </button>
    </section>
  );
}
