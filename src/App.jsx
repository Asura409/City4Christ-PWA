import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastProvider } from "@/components/Toast";
import { Nav } from "@/components/Nav";
import HomeScreen from "@/screens/HomeScreen";
import WordScreen from "@/screens/WordScreen";
import PrayerScreen from "@/screens/PrayerScreen";
import GroupsScreen from "@/screens/GroupsScreen";
import GroupAdminScreen from "@/screens/GroupAdminScreen";
import EventsScreen from "@/screens/EventsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import LoginScreen from "@/screens/LoginScreen";
import SignUpScreen from "@/screens/SignUpScreen";
import NewUserScreen from "@/screens/NewUserScreen";
import "./App.css";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DesignPreview } from "./components/DesignPreview";
import VerifyScreen from "./screens/VerifyScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import PostsScreen from "./screens/PostsScreen";
import { CreateSheet } from "./components/CreateSheet";
import { createPost } from "./posts/api";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/new-user",
  "/forgot-password",
  "/verify",
];

export default function App() {
  const [createOpen, setCreateOpen] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const { pathname } = useLocation();
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuth) {
    return (
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route
            path="/new-user"
            element={
              <ProtectedRoute>
                <NewUserScreen />
              </ProtectedRoute>
            }
          />
          <Route path="/verify" element={<VerifyScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
              >
                <path d="M6 5c4 3 8 5 12 6M18 5c-4 3-8 5-12 6M12 8v13" />
              </svg>
            </div>
            <b>City4Christ</b>
            <a className="link" href="#/profile">
              My account
            </a>
          </div>
        </header>

        <main className="screens">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomeScreen />
                </ProtectedRoute>
              }
            />
            <Route path="/word" element={<WordScreen />} />
            <Route path="/posts" element={<ProtectedRoute><PostsScreen refreshKey={postsVersion} /></ProtectedRoute>} />
            <Route
              path="/prayer"
              element={
                <DesignPreview>
                  <PrayerScreen />
                </DesignPreview>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/manage"
              element={<ProtectedRoute><GroupAdminScreen /></ProtectedRoute>}
            />
            <Route
              path="/groups/manage/:groupId"
              element={<ProtectedRoute><GroupAdminScreen /></ProtectedRoute>}
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <DesignPreview>
                  <EventsScreen />
                </DesignPreview>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileScreen />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>

        <Nav onFab={() => setCreateOpen(true)} />

        <CreateSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onPost={async ({ body }) => { await createPost({ body }); setPostsVersion((value) => value + 1); }}
        />
      </div>
    </ToastProvider>
  );
}
