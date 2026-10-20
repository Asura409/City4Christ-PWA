import React, { useState } from 'react';
import { Icon } from '@/lib/icons';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/components/Toast';

const GROUPS = [
  {
    id: 'youth', name: 'Youth Explosion', leader: 'Pastor Daniel',
    tel: '+18002537739', phone: '+1 (800) 253-7739', time: 'Fridays at 7 PM',
    members: 48, icon: 'flame', g: ['#e08b4a','#7b46c9'],
    names: ['Gbande James','Sarah Okafor','Tolu Adeyemi','Kemi B'],
    peekTitle: 'Latest in the group feed',
    peek: { who: 'Sarah Okafor', text: "Testimony time: I'm so excited to see what God is doing in this group." },
    topics: 15,
  },
  {
    id: 'women', name: 'Women of Faith', leader: 'Sister Mary',
    tel: '+15003738000', phone: '+1 (500) 373-8000', time: 'Fridays at 7 PM',
    members: 62, icon: 'dove', g: ['#d76b9a','#5b3aa8'],
    names: ['Mary Eze','Ruth A','Sarah Okafor','Joy N'],
    peekTitle: "This week's discussion",
    peek: { who: 'Mary Eze', text: '"Contentment and endurance by faith." Share what this means to you.' },
    topics: 3,
  },
  {
    id: 'men', name: 'Men of Valor', leader: 'Brother Tunde',
    tel: '+18003335000', phone: '+1 (800) 333-5000', time: 'Saturdays at 8 AM',
    members: 37, icon: 'shield', g: ['#3f86c8','#3a2a8a'],
    names: ['Tunde B','Chidi Okeke','David A','Paul M'],
    peekTitle: 'Latest in the group feed',
    peek: { who: 'Tunde B', text: 'Breakfast and prayer this Saturday. Bring a friend who needs encouragement.' },
    topics: 9,
  },
];

export default function GroupsScreen() {
  const toast = useToast();
  const [joined, setJoined] = useState({});

  return (
    <section className="screen active" aria-label="Ministry groups">
      <p className="lead" style={{ marginBottom: 14 }}>Find your people. Join a group to see its private feed.</p>
      {GROUPS.map(g => {
        const j = joined[g.id];
        return (
          <article key={g.id} className="card group">
            <div className="cover" style={{ '--g1': g.g[0], '--g2': g.g[1] }}>
              <div className="g-ic"><Icon name={g.icon} /></div>
            </div>
            <div className="g-body">
              <h3>{g.name}</h3>
              <div className="g-meta">
                <div><Icon name="users" />Led by {g.leader}</div>
                <div><Icon name="clock" />{g.time}</div>
                <div><Icon name="phone" /><a href={`tel:${g.tel.replace(/[^+\d]/g, '')}`}>{g.phone}</a></div>
              </div>
              <div className="members">
                <div className="stack">{g.names.map(n => <Avatar key={n} name={n} size={28} />)}</div>
                <span>{g.members + (j ? 1 : 0)} members</span>
              </div>
              <div className="peek">
                <small><Icon name="lock" />{g.peekTitle}</small>
                <div className="q"><Avatar name={g.peek.who} size={30} /><span>{g.peek.text}</span></div>
                <span className="n">{g.topics} discussion topics</span>
              </div>
              <button
                className={`btn gold block${j ? ' on' : ''}`}
                onClick={() => {
                  setJoined(jn => ({ ...jn, [g.id]: !jn[g.id] }));
                  if (!j) toast('Request sent to the group leader');
                }}
              >
                {j ? <><Icon name="check" />Request sent</> : 'Join group'}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
