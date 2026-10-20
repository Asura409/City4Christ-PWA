import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';
import { Nav } from '@/components/Nav';
import { CreateSheet } from '@/components/CreateSheet';
import HomeScreen    from '@/screens/HomeScreen';
import WordScreen    from '@/screens/WordScreen';
import PrayerScreen  from '@/screens/PrayerScreen';
import GroupsScreen  from '@/screens/GroupsScreen';
import EventsScreen  from '@/screens/EventsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import LoginScreen   from '@/screens/LoginScreen';
import SignUpScreen  from '@/screens/SignUpScreen';
import NewUserScreen from '@/screens/NewUserScreen';
import './App.css';

const AUTH_ROUTES = ['/login', '/signup', '/new-user', '/forgot-password'];

export default function App() {
  const [createOpen, setCreateOpen] = useState(false);
  const { pathname } = useLocation();
  const isAuth = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const defaultType = pathname === '/prayer' ? 'prayer' : 'post';

  if (isAuth) {
    return (
      <div className="app">
        <Routes>
          <Route path="/login"    element={<LoginScreen />} />
          <Route path="/signup"   element={<SignUpScreen />} />
          <Route path="/new-user" element={<NewUserScreen />} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 5c4 3 8 5 12 6M18 5c-4 3-8 5-12 6M12 8v13" />
              </svg>
            </div>
            <b>City4Christ</b>
          </div>
        </header>

        <main className="screens">
          <Routes>
            <Route path="/"        element={<Navigate to="/login" replace />} />
            <Route path="/home"    element={<HomeScreen />} />
            <Route path="/word"    element={<WordScreen />} />
            <Route path="/prayer"  element={<PrayerScreen />} />
            <Route path="/groups"  element={<GroupsScreen />} />
            <Route path="/events"  element={<EventsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="*"        element={<Navigate to="/login" replace />} />
          </Routes>
        </main>

        <Nav onFab={() => setCreateOpen(true)} />

        <CreateSheet
          open={createOpen}
          defaultType={defaultType}
          onClose={() => setCreateOpen(false)}
          onPost={() => {}}
        />
      </div>
    </ToastProvider>
  );
}
