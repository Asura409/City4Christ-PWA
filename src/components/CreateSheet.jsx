import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';
import { Avatar } from './Avatar';
import { useToast } from './Toast';

const TYPES = [
  { id: 'post',      icon: 'sparkle', label: 'Post',      desc: 'Share an update',   placeholder: "What's on your heart? Share with your church…",  success: 'Posted'           },
  { id: 'prayer',    icon: 'flame',   label: 'Prayer',    desc: 'Ask for prayer',     placeholder: 'What can we pray with you about?',                success: 'Prayer posted'    },
  { id: 'testimony', icon: 'sun',     label: 'Testimony', desc: 'Tell what God did',  placeholder: 'What has God done for you?',                      success: 'Testimony shared' },
];
const PRIVS = [
  { id: 'everyone', label: 'Everyone',    icon: 'users'    },
  { id: 'group',    label: 'My group',    icon: 'userplus' },
  { id: 'pastor',   label: 'Pastor only', icon: 'lock'     },
];
const PRIV_NOTE = {
  everyone: 'Anyone in the church can see this and pray with you.',
  group:    'Only members of your groups can see this.',
  pastor:   'Only the pastors will see this request.',
};
const VERSES = [
  '"The Lord is my strength and my shield." — Psalm 28:7',
  '"Be strong and courageous." — Joshua 1:9',
  '"Cast all your anxiety on him because he cares for you." — 1 Peter 5:7',
];

export function CreateSheet({ open, defaultType = 'post', onClose, onPost }) {
  const toast = useToast();
  const [type, setType] = useState(defaultType);
  const [text, setText] = useState('');
  const [priv, setPriv] = useState('everyone');
  const [vi, setVi] = useState(0);
  const taRef = useRef(null);

  useEffect(() => { setType(defaultType); }, [defaultType]);
  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus({ preventScroll: true }), 320); }, [open]);

  const ct = TYPES.find(t => t.id === type);

  function share() {
    if (!text.trim()) return;
    onPost?.({ type, text: text.trim(), priv });
    toast(ct.success);
    setText('');
    onClose();
  }

  function addVerse() {
    const v = VERSES[vi % VERSES.length];
    setVi(i => i + 1);
    const next = (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + v;
    setText(next.slice(0, 500));
  }

  return (
    <div
      className={`create${open ? ' show' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crTitle"
      aria-hidden={!open}
    >
      <div className="cr-top">
        <button className="round" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h2 id="crTitle">Create</h2>
        <button className="btn gold cr-share" disabled={!text.trim()} onClick={share}>Share</button>
      </div>
      <div className="cr-scroll">
        <div className="cr-types" role="radiogroup" aria-label="What are you sharing?">
          {TYPES.map(t => (
            <button key={t.id} className="cr-type" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)}>
              <Icon name={t.icon} /><b>{t.label}</b><small>{t.desc}</small>
            </button>
          ))}
        </div>
        <div className="cr-compose">
          <div className="cr-who">
            <Avatar name="Anjee Samuel" size={40} />
            <div><b>You</b><span>{type === 'prayer' ? (priv === 'everyone' ? 'Sharing with everyone' : priv === 'group' ? 'Sharing with your groups' : 'Sharing with pastors only') : 'Sharing with your church'}</span></div>
          </div>
          <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)} placeholder={ct.placeholder} maxLength={500} aria-label="Your message" />
          <div className="cr-meta"><span style={{ color: text.length > 460 ? 'var(--gold-2)' : undefined }}>{text.length}/500</span></div>
        </div>
        {type === 'prayer' && (
          <div>
            <h3 className="cr-label">Who can see this prayer</h3>
            <div className="seg" role="radiogroup" aria-label="Who can see this prayer">
              {PRIVS.map(p => (
                <button key={p.id} role="radio" aria-checked={priv === p.id} onClick={() => setPriv(p.id)}>
                  <Icon name={p.icon} />{p.label}
                </button>
              ))}
            </div>
            <p className="cr-note">{PRIV_NOTE[priv]}</p>
          </div>
        )}
      </div>
      <div className="cr-tools">
        <button onClick={() => toast('Photos are coming soon')}><Icon name="image" />Photo</button>
        <button onClick={addVerse}><Icon name="book" />Add scripture</button>
      </div>
    </div>
  );
}
