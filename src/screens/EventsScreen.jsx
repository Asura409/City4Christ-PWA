import React, { useState } from 'react';
import { Icon } from '@/lib/icons';
import { useToast } from '@/components/Toast';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function sameDay(a, b) { return a.getTime() === b.getTime(); }
function mon(d) { return d.toLocaleDateString('en-US', { month: 'short' }); }
function when(o) { return o === 0 ? 'Today' : o === 1 ? 'Tomorrow' : `In ${o} days`; }

const EVENTS = [
  { id: 'e1', off: 2,  title: 'Altar of intercession',  time: '9:00 PM', where: 'Online stream',  going: 128 },
  { id: 'e2', off: 2,  title: 'Altar of intercession',  time: '9:00 PM', where: 'Main Sanctuary', going: 64  },
  { id: 'e3', off: 3,  title: 'Youth Explosion',         time: '7:00 PM', where: 'Fellowship Hall',going: 41  },
  { id: 'e4', off: 6,  title: 'Worship night',           time: '6:00 PM', where: 'Main Sanctuary', going: 212 },
  { id: 'e5', off: 10, title: 'Women of Faith retreat',  time: '8:00 AM', where: 'Garden Room',    going: 37  },
];

export default function EventsScreen() {
  const toast = useToast();
  const [weekOff, setWeekOff] = useState(0);
  const [sel, setSel] = useState(addDays(TODAY, 2));
  const [rsvp, setRsvp] = useState({});

  const weekBase = addDays(TODAY, -TODAY.getDay() + weekOff * 7);
  const weekEnd  = addDays(weekBase, 6);
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const monthTitle = mon(weekBase) === mon(weekEnd)
    ? weekBase.toLocaleDateString('en-US', { month: 'long' }) + ' ' + weekEnd.getFullYear()
    : `${mon(weekBase)} – ${mon(weekEnd)} ${weekEnd.getFullYear()}`;

  const evOn = d => EVENTS.filter(e => sameDay(addDays(TODAY, e.off), d));
  const dayEvents = evOn(sel);

  function prevWeek() { setWeekOff(w => w - 1); setSel(addDays(TODAY, -TODAY.getDay() + (weekOff - 1) * 7)); }
  function nextWeek() { setWeekOff(w => w + 1); setSel(addDays(TODAY, -TODAY.getDay() + (weekOff + 1) * 7)); }

  return (
    <section className="screen active" aria-label="Events">
      <div className="card cal">
        <div className="cal-h">
          <button className="round" onClick={prevWeek} aria-label="Previous week" style={{ width: 36, height: 36, background: 'var(--surface-2)' }}><Icon name="back" /></button>
          <b>{monthTitle}</b>
          <button className="round" onClick={nextWeek} aria-label="Next week" style={{ width: 36, height: 36, background: 'var(--surface-2)' }}><Icon name="next" /></button>
        </div>
        <div className="week">
          {DAY_NAMES.map(n => <small key={n}>{n}</small>)}
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekBase, i);
            const isToday = sameDay(d, TODAY);
            const hasDot = evOn(d).length > 0;
            const isSelected = sameDay(d, sel);
            return (
              <button
                key={i}
                className={`day${isToday ? ' today' : ''}${hasDot ? ' has' : ''}`}
                aria-pressed={isSelected}
                aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + (hasDot ? ', has events' : '')}
                onClick={() => setSel(d)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sh">
        <h2>{sameDay(sel, TODAY) ? 'Today' : sel.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
      </div>

      {dayEvents.length === 0
        ? <div className="empty">Nothing planned for this day.<br />Pick a day with a gold dot.</div>
        : dayEvents.map(e => {
            const d = addDays(TODAY, e.off);
            const going = rsvp[e.id];
            return (
              <article key={e.id} className={`ticket${going ? ' going' : ''}`}>
                <div className="t-main">
                  <div className="t-top">
                    <div className="dt"><small>{mon(d)}</small><b>{d.getDate()}</b></div>
                    <div className="t-info">
                      <h3>{e.title}</h3>
                      <p><Icon name="clock" />{e.time}</p>
                      <p><Icon name="pin" />{e.where}</p>
                      <p><Icon name="users" /><span>{e.going + (going ? 1 : 0)} going</span></p>
                    </div>
                    <span className="when">{when(e.off)}</span>
                  </div>
                  <div className="t-extra">
                    <button className="btn blue" onClick={() => toast('Added to your calendar')}><Icon name="cal" />Add to calendar</button>
                    <button className="vol" onClick={() => toast('Thanks for serving')}><Icon name="userplus" />Volunteer</button>
                  </div>
                  {going && (
                    <div className="going-row">
                      <span className="stub-ck"><Icon name="check" /></span>
                      <div><b>You're going</b><small>Your spot is saved</small></div>
                      <button className="undo" onClick={() => setRsvp(r => ({ ...r, [e.id]: false }))}>Undo</button>
                    </div>
                  )}
                </div>
                {!going && (
                  <div className="t-bottom">
                    <button className="btn gold block rsvp-btn" onClick={() => { setRsvp(r => ({ ...r, [e.id]: true })); toast(`You're going to ${e.title}`); }}>
                      <Icon name="ticket" />RSVP
                    </button>
                  </div>
                )}
              </article>
            );
          })
      }
    </section>
  );
}
