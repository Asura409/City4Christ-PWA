import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/lib/icons';
import { AuthLayout } from '@/components/AuthLayout';

const MINISTRIES = [
  { id: 'worship',  label: 'Worship',       icon: 'music'    },
  { id: 'youth',    label: 'Youth',          icon: 'sparkle'  },
  { id: 'prayer',   label: 'Prayer',         icon: 'flame'    },
  { id: 'outreach', label: 'Outreach',       icon: 'globe'    },
  { id: 'media',    label: 'Media',          icon: 'mic'      },
  { id: 'kids',     label: "Children's",     icon: 'heart'    },
];

const STEPS = [
  { id: 'welcome',   title: 'Welcome home 🙌', sub: "You're now part of City4Christ. Let's get you set up." },
  { id: 'interests', title: 'What moves you?', sub: "Pick the ministries you'd love to be part of." },
  { id: 'notify',    title: 'Stay connected',  sub: 'Let us know how to keep you in the loop.' },
];

export default function NewUserScreen() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [notify, setNotify]   = useState({ prayer: true, events: true, word: false });
  const [loading, setLoading] = useState(false);

  function toggleMin(id) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function finish() {
    setLoading(true);
    try {
      await fetch('https://city4christ-staging-api.onrender.com/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ministries: [...selected],
          notifications: notify,
        }),
      }).catch(() => {});
    } finally {
      navigate('/home', { replace: true });
    }
  }

  const current = STEPS[step];

  return (
    <AuthLayout>
      {/* step dots */}
      <div className="onboard-dots" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={`onboard-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
        ))}
      </div>

      <h2 className="auth-title" style={{ marginTop: 12 }}>{current.title}</h2>
      <p className="auth-sub">{current.sub}</p>

      <div className="auth-card" style={{ marginTop: 20 }}>
        {step === 0 && (
          <div className="onboard-welcome">
            <div className="onboard-icon" aria-hidden="true">
              <Icon name="dove" />
            </div>
            <p className="onboard-blurb">
              Your faith journey with thousands of believers across the city starts here. Explore sermons, join a prayer group, and grow together.
            </p>
            <button className="btn gold block auth-submit" onClick={() => setStep(1)}>
              Get started
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="onboard-grid" role="group" aria-label="Choose ministries">
              {MINISTRIES.map(m => (
                <button
                  key={m.id}
                  className={`onboard-min${selected.has(m.id) ? ' on' : ''}`}
                  onClick={() => toggleMin(m.id)}
                  aria-pressed={selected.has(m.id)}
                >
                  <Icon name={m.icon} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <div className="auth-row" style={{ marginTop: 18, gap: 10 }}>
              <button className="btn soft" style={{ flex: 1 }} onClick={() => setStep(0)}>Back</button>
              <button className="btn gold" style={{ flex: 2 }} onClick={() => setStep(2)}>
                {selected.size > 0 ? `Continue (${selected.size})` : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="onboard-notifs">
              {[
                { key: 'prayer', icon: 'flame',   label: 'Prayer requests',  desc: 'When someone in your church posts a prayer' },
                { key: 'events', icon: 'cal',     label: 'Events',           desc: 'Upcoming events and schedule changes'        },
                { key: 'word',   icon: 'book',    label: 'New sermons',      desc: 'When a new message or series is posted'      },
              ].map(n => (
                <label key={n.key} className={`onboard-notif${notify[n.key] ? ' on' : ''}`}>
                  <div className="onboard-notif-icon"><Icon name={n.icon} /></div>
                  <div className="onboard-notif-text">
                    <b>{n.label}</b>
                    <span>{n.desc}</span>
                  </div>
                  <div className="onboard-toggle" aria-hidden="true">
                    <input
                      type="checkbox"
                      checked={notify[n.key]}
                      onChange={e => setNotify(v => ({ ...v, [n.key]: e.target.checked }))}
                      aria-label={`Enable ${n.label} notifications`}
                    />
                    <span className="toggle-track">
                      <span className="toggle-thumb" />
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="auth-row" style={{ marginTop: 18, gap: 10 }}>
              <button className="btn soft" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
              <button className="btn gold" style={{ flex: 2 }} disabled={loading} onClick={finish}>
                {loading ? 'Setting up…' : "Let's go!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
