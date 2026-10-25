import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';
import { Avatar } from './Avatar';
import { useToast } from './Toast';

const TYPES = [
  { id: 'post',      icon: 'sparkle', label: 'Post',      desc: 'Share an update',   placeholder: "What's on your heart? Share with your church…",  success: 'Posted'           },
];
const VERSES = [
  '"The Lord is my strength and my shield." — Psalm 28:7',
  '"Be strong and courageous." — Joshua 1:9',
  '"Cast all your anxiety on him because he cares for you." — 1 Peter 5:7',
];

export function CreateSheet({ open, defaultType = 'post', onClose, onPost }) {
  const toast = useToast();
  const [type, setType] = useState(defaultType);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [vi, setVi] = useState(0);
  const taRef = useRef(null);

  useEffect(() => { setType(defaultType); }, [defaultType]);
  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus({ preventScroll: true }), 320); }, [open]);

  const ct = TYPES.find(t => t.id === type);

  async function share() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onPost?.({ body: text.trim() });
      toast(ct.success);
      setText('');
      onClose();
    } catch (error) {
      toast(error.message || 'Could not publish your post.');
    } finally { setSaving(false); }
  }

  function addVerse() {
    const v = VERSES[vi % VERSES.length];
    setVi(i => i + 1);
    const next = (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + v;
    setText(next.slice(0, 5000));
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
        <button className="btn gold cr-share" disabled={!text.trim() || saving} onClick={share}>{saving ? 'Sharing…' : 'Share'}</button>
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
            <Avatar name="You" size={40} />
            <div><b>You</b><span>Sharing with your church</span></div>
          </div>
          <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)} placeholder={ct.placeholder} maxLength={5000} aria-label="Your message" />
          <div className="cr-meta"><span>{text.length}/5000</span></div>
        </div>
      </div>
      <div className="cr-tools">
        <button onClick={() => toast('Photos are coming soon')}><Icon name="image" />Photo</button>
        <button onClick={addVerse}><Icon name="book" />Add scripture</button>
      </div>
    </div>
  );
}
