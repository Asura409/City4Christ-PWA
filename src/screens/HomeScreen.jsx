import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";
import { useSession } from "@/auth/session";
const tiles = [
  ["/word", "mic", "Sermons"],
  ["/profile", "users", "My profile"],
  ["/groups", "users", "Church groups"],
  ["/events", "cal", "Church events"],
];
export default function HomeScreen() {
  const { profile } = useSession(),
    navigate = useNavigate();
  return (
    <section className="screen active" aria-label="Home">
      <h1 className="greet">Welcome, {profile.firstName}</h1>
      <p className="lead">The House of Good News</p>
      <section className="hero" aria-label="Daily bread">
        <span className="pill">
          <Icon name="sun" />
          Daily bread
        </span>
        <p className="verse">The Lord is my strength and my shield.</p>
        <cite>Psalm 28:7</cite>
      </section>
      <div className="sh">
        <h2>Explore City4Christ</h2>
      </div>
      <div className="tiles">
        {tiles.map(([path, icon, label]) => (
          <button key={path} className="tile" onClick={() => navigate(path)}>
            <span
              style={{ background: "linear-gradient(145deg,#8a4fe0,#5a2fa8)" }}
            >
              <Icon name={icon} />
            </span>
            {label}
          </button>
        ))}
      </div>
      <p className="lead">
        Sermons, community posts, church events, prayer requests and direct messages are connected.
      </p>
    </section>
  );
}
