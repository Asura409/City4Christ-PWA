import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/lib/icons';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/components/Toast';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const TILES = [
  { path: '/prayer', icon: 'flame', label: 'Prayer wall', g: '#e0883f,#c2492f' },
  { path: '/word',   icon: 'mic',   label: 'Sermons',     g: '#8a4fe0,#5a2fa8' },
  { path: '/groups', icon: 'users', label: 'Groups',      g: '#3f86d0,#3a3fa0' },
  { path: '/events', icon: 'cal',   label: 'Events',      g: '#35a37a,#2a7a8f' },
];

const EVENTS = [
  { id: 'e1', off: 2, title: 'Altar of intercession', time: '9:00 PM', where: 'Online stream', going: 128 },
  { id: 'e2', off: 3, title: 'Youth Explosion',        time: '7:00 PM', where: 'Fellowship Hall', going: 41 },
  { id: 'e3', off: 6, title: 'Worship night',          time: '6:00 PM', where: 'Main Sanctuary',  going: 212 },
];

const FEED = [
  { id: 'f1', name: 'Gbande James', role: 'Youth Ministry', time: '2h', text: 'God answered our prayers for the outreach! Forty-three people came out and twelve gave their lives to Christ.', amen: 18, com: 3 },
  { id: 'f2', name: 'Sarah Okafor', role: 'Women of Faith', time: '5h', text: 'Reminder: Altar of intercession starts at 9 this week. Bring someone with you.', amen: 9, com: 1 },
];

const VERSE_WORDS = 'The Lord is my strength and my shield.'.split(' ');

export default function HomeScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const [doneToday, setDoneToday] = useState(false);
  const [liked, setLiked] = useState({});

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const todayIdx = TODAY.getDay();

  const dateStr = TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  function mon(d) { return d.toLocaleDateString('en-US', { month: 'short' }); }
  function when(o) { return o === 0 ? 'Today' : o === 1 ? 'Tomorrow' : `In ${o} days`; }

  function streakCount() {
    let n = 0;
    for (let i = todayIdx - 1; i >= Math.max(0, todayIdx - 3); i--) n++;
    return doneToday ? n + 1 : n;
  }

  const streakDays = Array.from({ length: 7 }, (_, i) => ({
    label: 'SMTWTFS'[i],
    done: (i < todayIdx && i >= todayIdx - 3) || (i === todayIdx && doneToday),
    isToday: i === todayIdx,
  }));

  const n = streakCount();

  return (
    <section className="screen active" aria-label="Home">
      <h1 className="greet">{greeting}</h1>
      <p className="lead">Here's what's happening at church today.</p>

      {/* Hero */}
      <section className="hero" aria-label="Daily bread">
        <div className="hero-top">
          <span className="pill"><Icon name="sun" />Daily bread</span>
          <span>{dateStr}</span>
        </div>
        <p className="verse">
          {VERSE_WORDS.map((w, i) => (
            <span key={i} className="w" style={{ '--i': i }}>{w} </span>
          ))}
        </p>
        <cite>Psalm 28:7</cite>
        <div className="hero-act">
          <button className="btn dark" onClick={() => toast('Opening daily reading…')}>
            <Icon name="play" />Listen · 2 min
          </button>
          <button className="btn dark" onClick={() => { if (!doneToday) { setDoneToday(true); toast('Reading complete. Streak extended'); } else toast("You've finished today's reading"); }}>
            <Icon name={doneToday ? 'check' : 'book'} />{doneToday ? 'Done today' : 'Devotional'}
          </button>
        </div>
        <div className="streak">
          <p>{n ? `${n}-day reading streak` : 'Start your streak today'}<small>{doneToday ? "Today's reading is done" : "Finish today's devotional to keep it going"}</small></p>
          <div className="days">
            {streakDays.map((d, i) => (
              <span key={i} className={`sd${d.done ? ' done' : ''}${d.isToday ? ' today' : ''}`}>
                {d.done ? <Icon name="check" /> : d.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tiles */}
      <div className="sh"><h2>Jump to</h2></div>
      <div className="tiles">
        {TILES.map(t => (
          <button key={t.path} className="tile" onClick={() => navigate(t.path)}>
            <span style={{ background: `linear-gradient(145deg,${t.g})` }}><Icon name={t.icon} /></span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Coming up */}
      <div className="sh"><h2>Coming up</h2><button className="link" onClick={() => navigate('/events')}>See all</button></div>
      <div className="rail">
        {EVENTS.map(e => {
          const d = addDays(TODAY, e.off);
          return (
            <article key={e.id} className="ticket" style={{ flex: '0 0 86%', scrollSnapAlign: 'start' }}>
              <div className="t-main">
                <div className="t-top">
                  <div className="dt"><small>{mon(d)}</small><b>{d.getDate()}</b></div>
                  <div className="t-info">
                    <h3>{e.title}</h3>
                    <p><Icon name="clock" />{e.time}</p>
                    <p><Icon name="pin" />{e.where}</p>
                    <p><Icon name="users" /><span>{e.going} going</span></p>
                  </div>
                  <span className="when">{when(e.off)}</span>
                </div>
              </div>
              <div className="t-bottom">
                <button className="btn gold block rsvp-btn" onClick={() => toast(`You're going to ${e.title}`)}>
                  <Icon name="ticket" />RSVP
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Feed */}
      <div className="sh"><h2>Fellowship feed</h2></div>
      {FEED.map(p => (
        <article key={p.id} className="card post">
          <div className="who">
            <button onClick={() => navigate('/profile')} aria-label="View profile">
              <Avatar name={p.name} size={42} />
            </button>
            <div><b>{p.name}</b><span>{p.role} · {p.time}</span></div>
          </div>
          <p className="body">{p.text}</p>
          <div className="foot">
            <button
              className="react"
              aria-pressed={!!liked[p.id]}
              onClick={() => setLiked(l => ({ ...l, [p.id]: !l[p.id] }))}
            >
              <Icon name="heart" /><span>{p.amen + (liked[p.id] ? 1 : 0)}</span> Amen
            </button>
            <span className="mini-link"><Icon name="comment" />{p.com} comments</span>
          </div>
        </article>
      ))}
    </section>
  );
}
