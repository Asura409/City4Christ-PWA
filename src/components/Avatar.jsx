import React from 'react';
import { avatarGradient, initials } from '@/lib/avatar';

export function Avatar({ name, size = 40 }) {
  const [c1, c2] = avatarGradient(name);
  return (
    <span
      className="av"
      style={{
        '--s': `${size}px`,
        background: `linear-gradient(135deg,${c1},${c2})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
