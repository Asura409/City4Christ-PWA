import React from 'react';
import { avatarGradient, initials } from '@/lib/avatar';

export function Avatar({ name, size = 40, src = "" }) {
  const [c1, c2] = avatarGradient(name);
  let photo = "";
  try {
    const url = new URL(src);
    if (url.protocol === "https:" && !url.username && !url.password) photo = url.href;
  } catch {}
  return (
    <span
      className="av"
      style={{
        '--s': `${size}px`,
        background: `linear-gradient(135deg,${c1},${c2})`,
      }}
    >
      {photo ? <img className="avatar-photo" src={photo} alt="" /> : initials(name)}
    </span>
  );
}
