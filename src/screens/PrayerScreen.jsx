import React, { useState } from 'react';
import { Icon } from '@/lib/icons';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/components/Toast';

const INITIAL = {
  feed: [
    { id: 'p1', name: 'Tolu Adeyemi', time: '1h', text: 'Please pray for wisdom and peace as I make a big decision about my career.', priv: 'everyone', count: 12, com: 2 },
    { id: 'p2', name: 'Chidi Okeke',  time: '4h', text: 'Thank you all for praying for my mother. She is recovering well.',          priv: 'pastor',   count: 7,  com: 3 },
  ],
  answered: [
    { id: 'p3', name: 'Gbande James', time: '2d', text: 'We prayed for provision for the outreach, and God provided every need. Thank you for standing with us.', priv: 'everyone', count: 31, com: 5 },
  ],
};

export default function PrayerScreen() {
  const toast = useToast();
  const [tab, setTab] = useState('feed');
  const [prayers, setPrayers] = useState(INITIAL);
  const [prayed, setPrayed] = useState({});
  const [lifted, setLifted] = useState(1284);

  const items = prayers[tab] || [];

  function togglePrayed(id) {
    const on = !prayed[id];
    setPrayed(p => ({ ...p, [id]: on }));
    setLifted(l => l + (on ? 1 : -1));
  }

  function markAnswered(id) {
    setPrayers(p => {
      const idx = p.feed.findIndex(x => x.id === id);
      if (idx < 0) return p;
      const item = p.feed[idx];
      return { feed: p.feed.filter((_, i) => i !== idx), answered: [item, ...p.answered] };
    });
    toast('Praise God. Moved to answered');
  }

  return (
    <section className="screen active" aria-label="Prayer wall">
      {/* Altar */}
      <div className="altar">
        <svg className="candle" viewBox="0 0 56 108" aria-hidden="true">
          <defs>
            <radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffcf6a" stopOpacity=".85"/><stop offset="1" stopColor="#ff9a3d" stopOpacity="0"/></radialGradient>
            <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff8a3d"/><stop offset=".6" stopColor="#ffc24d"/><stop offset="1" stopColor="#fff2c4"/></linearGradient>
            <linearGradient id="wx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e9dff8"/><stop offset="1" stopColor="#b9a8e6"/></linearGradient>
          </defs>
          <circle className="glow" cx="28" cy="32" r="30" fill="url(#gl)"/>
          <g className="flame">
            <path d="M28 6c3 11 13 17 13 30a13 13 0 01-26 0c0-8 4-12 8-16 1 5 3 7 5 7-2-8-2-14 0-21z" fill="url(#fl)"/>
            <path d="M28 28c2 5 6 8 6 13a6 6 0 01-12 0c0-3 2-5 4-7 0 2 1 3 2 3z" fill="#fff6d8" opacity=".9"/>
          </g>
          <rect x="10" y="52" width="36" height="52" rx="7" fill="url(#wx)"/>
          <rect x="26.5" y="46" width="3" height="9" rx="1.5" fill="#4b2a8f"/>
        </svg>
        <div>
          <h1>Pray with your church</h1>
          <p><strong>{lifted.toLocaleString('en-US')}</strong> prayers lifted this week</p>
        </div>
      </div>

      <p className="lead" style={{ margin: '16px 2px 0' }}>Tap + to share a request. Tap "I prayed for this" to stand with someone.</p>

      <div className="tabs" role="tablist">
        {['feed','answered'].map(t => (
          <button key={t} className="tab" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'feed' ? 'Prayer feed' : 'Answered'}
          </button>
        ))}
      </div>

      {items.length === 0 && <div className="empty">Nothing here yet.</div>}
      {items.map(p => {
        const on = prayed[p.id];
        const ans = tab === 'answered';
        return (
          <article key={p.id} className={`card post${ans ? ' answered' : ''}`}>
            <div className="who">
              <Avatar name={p.own ? 'You' : p.name} size={40} />
              <div>
                <b>{p.own ? 'You' : p.name}</b>
                <span>{p.time}{p.priv === 'pastor' ? ' · Pastor only' : p.priv === 'group' ? ' · My group' : ''}</span>
              </div>
            </div>
            {ans && <span className="badge-ans"><Icon name="check" />Answered</span>}
            <p className="body">{p.text}</p>
            <div className="foot">
              <button className="pray" aria-pressed={!!on} onClick={() => togglePrayed(p.id)}>
                <Icon name="flame" />{on ? 'Prayed' : 'I prayed for this'} · {p.count + (on ? 1 : 0)}
              </button>
              {p.own && !ans
                ? <button className="answer" onClick={() => markAnswered(p.id)}><Icon name="check" />Mark answered</button>
                : <span className="mini-link"><Icon name="comment" />{p.com}</span>
              }
            </div>
          </article>
        );
      })}
    </section>
  );
}
