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
    <section className="screen active home-screen" aria-label="Home">
      <section className="welcome-card fade-up">
        <h1>Welcome, {profile.firstName} 🙏</h1>
        <p>Welcome back to your faith community</p>
      </section>
      <section className="banner-card fade-up">
        <img src="/assets/images/home-welcome-couple.jpeg" alt="Welcome to City4Christ. We’re glad you are here." />
      </section>
      <DailyVerseCard />
      <div className="reference-quick-links">
        {[
          ["/events", "cal", "Events", "See upcoming gatherings"],
          ["/pastors", "users", "Book Pastor", "Request pastoral care"],
          ["/giving", "heart", "Giving", "Tithe, offering & more"],
          ["/bible", "book", "Bible", "Read the Word together"],
          ["/live", "play", "Live", "Join worship online"],
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
    </section>
  );
}
