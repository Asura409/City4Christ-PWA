import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@/lib/icons';
import { useToast } from './Toast';

const ITEMS = [
  { path: '/home', icon: 'home', label: 'Home' },
  { path: '/word', icon: 'book', label: 'Word' },
  null, // FAB slot
  { path: '/prayer', icon: 'flame', label: 'Prayer' },
  { path: '/chat', icon: 'chat', label: 'Chat' },
];

export function Nav({ onFab }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  const pillRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;
    const active = nav.querySelector('[aria-current="page"]');
    if (!active) { pill.style.opacity = 0; return; }
    const nr = nav.getBoundingClientRect();
    const br = active.getBoundingClientRect();
    pill.style.opacity = 1;
    pill.style.width = `${br.width - 8}px`;
    pill.style.transform = `translateX(${br.left - nr.left + 4}px)`;
  });

  return (
    <nav className="nav" ref={navRef} aria-label="Main">
      <span className="pill-i" ref={pillRef} />
      {ITEMS.map((item, i) => {
        if (!item) {
          return (
            <div key="fab" className="fab-slot">
              <button className="fab" onClick={onFab} aria-label="Create a post">
                <Icon name="plus" />
              </button>
            </div>
          );
        }
        const active = pathname === item.path || (pathname === '/' && item.path === '/home');
        return (
          <button
            key={item.path}
            className="nav-item"
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (item.path === '/chat') { toast('Chat is coming soon'); return; }
              navigate(item.path);
            }}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
