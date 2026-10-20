import React, { useState } from 'react';
import { Icon } from '@/lib/icons';
import { useToast } from '@/components/Toast';

const SERIES = [
  { title: 'The Book of Acts', sub: 'Pastor Dave and Pastor Grace · 8 messages', g: ['#8a4fe0','#2f1a63'] },
  { title: 'Rooted',           sub: 'Pastor Grace · 6 messages',                 g: ['#d98a3d','#5b2a8f'] },
  { title: 'Prayer that moves mountains', sub: 'Pastor Dave · 5 messages',       g: ['#3f7fd0','#3a1f7a'] },
];

const SERMONS = [
  { id: 1, title: 'Finding Peace',          pastor: 'Pastor Dave',  topic: 'Peace',  min: 15, blurb: 'Peace that holds when everything around you is shaking.', g: ['#8a4fe0','#3a1f7a'] },
  { id: 2, title: 'Walking in Faith',       pastor: 'Pastor Grace', topic: 'Faith',  min: 22, blurb: 'Taking the next step before the whole path is clear.',    g: ['#d98a3d','#7b2f8f'] },
  { id: 3, title: 'The Power of Agreement', pastor: 'Pastor Dave',  topic: 'Prayer', min: 31, blurb: 'What happens when a church prays with one voice.',         g: ['#3f7fd0','#3a1f7a'] },
  { id: 4, title: 'Building on the Rock',   pastor: 'Pastor Grace', topic: 'Family', min: 27, blurb: 'A home that stands when the storms come.',                 g: ['#35a37a','#2a4f8f'] },
  { id: 5, title: 'When Heaven Is Silent',  pastor: 'Pastor Dave',  topic: 'Faith',  min: 18, blurb: 'Trusting God in the long pause between prayer and answer.',g: ['#c2497a','#4b2a8f'] },
];

const TOPICS = ['All', 'Peace', 'Faith', 'Prayer', 'Family'];

export default function WordScreen() {
  const toast = useToast();
  const [topic, setTopic] = useState('All');
  const [openNote, setOpenNote] = useState(null);
  const [notes, setNotes] = useState({});

  const filtered = SERMONS.filter(s => topic === 'All' || s.topic === topic);

  return (
    <section className="screen active" aria-label="Sermons and media">
      <div className="sh" style={{ marginTop: 12 }}><h2>Featured series</h2></div>
      <div className="series-rail">
        {SERIES.map((s, i) => (
          <article key={i} className="series" style={{ '--g1': s.g[0], '--g2': s.g[1] }}>
            <div>
              <small>Featured series</small>
              <h3>{s.title}</h3>
              <p>{s.sub}</p>
            </div>
            <div className="row">
              <span className="pill" style={{ background: 'rgba(255,255,255,.18)', fontSize: 12.5, fontWeight: 700 }}>Start with episode 1</span>
              <button className="play" onClick={() => toast(`Playing ${s.title}`)} aria-label={`Play ${s.title}`}>
                <Icon name="play" fill />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="sh"><h2>Continue listening</h2></div>
      <div className="card cont">
        <button className="play sq" onClick={() => toast('Resuming Finding Peace')} style={{ width: 52, height: 52 }} aria-label="Resume Finding Peace">
          <Icon name="play" fill />
        </button>
        <div className="cont-info">
          <b>Finding Peace</b>
          <span>by Pastor Dave · 8 min left</span>
          <div className="bar"><i style={{ width: '45%' }} /></div>
        </div>
      </div>

      <div className="sh"><h2>All sermons</h2></div>
      <div className="chips" role="group" aria-label="Filter by topic">
        {TOPICS.map(t => (
          <button key={t} className="chip" aria-pressed={t === topic} onClick={() => setTopic(t)}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty">No sermons in this topic yet.</div>}
      {filtered.map(s => (
        <article key={s.id} className="card sermon">
          <div className="s-main">
            <div className="thumb" style={{ '--g1': s.g[0], '--g2': s.g[1] }}>
              <button className="play" onClick={() => toast(`Playing ${s.title}`)} aria-label={`Play ${s.title}`}>
                <Icon name="play" fill />
              </button>
            </div>
            <div className="s-text">
              <b>{s.title}</b>
              <p>{s.blurb}</p>
              <small>{s.pastor} · {s.min} min · {s.topic}</small>
            </div>
          </div>
          <div className="bar s-bar"><i style={{ width: s.id === 1 ? '45%' : '0%' }} /></div>
          <button
            className="note-t"
            aria-expanded={openNote === s.id}
            aria-controls={`note-${s.id}`}
            onClick={() => setOpenNote(openNote === s.id ? null : s.id)}
          >
            <span><Icon name="lock" />Private note</span>
            <Icon name="chev" className="chev" style={{ transform: openNote === s.id ? 'rotate(180deg)' : undefined, transition: '.2s' }} />
          </button>
          {openNote === s.id && (
            <div className="note-b" id={`note-${s.id}`}>
              <textarea
                value={notes[s.id] || ''}
                onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                placeholder="Your study notes. Only you can see these."
              />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
