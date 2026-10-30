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
import PastorsScreen from "@/screens/PastorsScreen";
import LoginScreen from "@/screens/LoginScreen";
import GoogleReturnScreen from '@/screens/GoogleReturnScreen';
import SignUpScreen from "@/screens/SignUpScreen";
import NewUserScreen from "@/screens/NewUserScreen";
import "./App.css";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import VerifyScreen from "./screens/VerifyScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import PostsScreen from "./screens/PostsScreen";
import MessagesScreen from "./screens/MessagesScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import { NotificationButton } from "./components/NotificationButton";
import { CreateSheet } from "./components/CreateSheet";
import { createPost, uploadPostMedia } from "./posts/api";
import GivingScreen from "./screens/GivingScreen";
import GivingReturnScreen from "./screens/GivingReturnScreen";

const AUTH_ROUTES = [
  '/google-return',
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
          <Route path="/google-return" element={<GoogleReturnScreen/>}/>
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
            <NotificationButton />
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
<Route path="/pastors" element={<ProtectedRoute><PastorsScreen/></ProtectedRoute>}/>
            <Route path="/posts" element={<ProtectedRoute><PostsScreen refreshKey={postsVersion} /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><MessagesScreen /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
            <Route path="/giving/return" element={<GivingReturnScreen />} />
            <Route path="/giving" element={<ProtectedRoute><GivingScreen /></ProtectedRoute>} />
            <Route
              path="/prayer"
              element={
                <ProtectedRoute>
                  <PrayerScreen />
                </ProtectedRoute>
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
              element={<EventsScreen />}
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
          onPost={async ({ body, files, setUploadStatus }) => {
            const attachmentIds = [];
            for (const file of files) attachmentIds.push(await uploadPostMedia(file, { onStatus: setUploadStatus }));
            await createPost({ body, ...(attachmentIds.length ? { attachmentIds } : {}) });
            setPostsVersion((value) => value + 1);
          }}
        />
      </div>
    </ToastProvider>
  );
}
