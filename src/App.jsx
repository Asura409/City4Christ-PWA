import WelcomeScreen from "./screens/WelcomeScreen";
import VisitorsScreen from "./screens/VisitorsScreen";
import DeletionRequestsScreen from "./screens/DeletionRequestsScreen";
import {
  GroupPostsScreen,
  GroupEventsScreen,
} from "./groups/GroupContentScreens";
import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ToastProvider } from "@/components/Toast";
import { IdentityConfirmationProvider } from "@/auth/identityConfirmation";
import { Nav } from "@/components/Nav";
import HomeScreen from "@/screens/HomeScreen";
import DevotionalsScreen from "@/screens/DevotionalsScreen";
import BibleScreen from "@/screens/BibleScreen";
import WordScreen from "@/screens/WordScreen";
import PrayerScreen from "@/screens/PrayerScreen";
import GroupsScreen from "@/screens/GroupsScreen";
import GroupAdminScreen from "@/screens/GroupAdminScreen";
import EventsScreen from "@/screens/EventsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import PastorsScreen from "@/screens/PastorsScreen";
import LoginScreen from "@/screens/LoginScreen";
import GoogleReturnScreen from "@/screens/GoogleReturnScreen";
import SignUpScreen from "@/screens/SignUpScreen";
import NewUserScreen from "@/screens/NewUserScreen";
import "./App.css";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import VerifyScreen from "./screens/VerifyScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import PostsScreen from "./screens/PostsScreen";
import MessagesScreen from "./screens/MessagesScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import NotificationSettingsScreen from "./screens/NotificationSettingsScreen";
import AdminCommunicationsScreen from "./screens/AdminCommunicationsScreen";
import AdminPrayerReportsScreen from "./screens/AdminPrayerReportsScreen";
import { NotificationButton } from "./components/NotificationButton";
import { CreateSheet } from "./components/CreateSheet";
import { createPost, uploadPostMedia } from "./posts/api";
import GivingScreen from "./screens/GivingScreen";
import GivingReturnScreen from "./screens/GivingReturnScreen";
import { AdminMemberSearch } from "@/members/AdminMemberSearch";
import { Icon } from "@/lib/icons";
import AdminDashboard from "@/admin/AdminDashboard";
import AdminShell from "@/admin/AdminShell";
import { NotificationToast } from "@/notifications/NotificationToast";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/auth/session";
import SermonPublishingScreen from "@/sermons/SermonPublishingScreen";
import MemberDirectoryScreen from "@/screens/MemberDirectoryScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import BroadcastManager from "./live/BroadcastManager";
import LiveScreen from "@/screens/LiveScreen";
import VideoTestScreen from "@/screens/VideoTestScreen";
import GetAppScreen from "@/screens/GetAppScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SearchScreen from "@/screens/SearchScreen";
import PastorDashboardScreen from "@/screens/PastorDashboardScreen";
import PastorAvailabilityScreen from "@/screens/PastorAvailabilityScreen";
import AdminEventsScreen from "@/screens/AdminEventsScreen";
import EventDetailScreen from "@/screens/EventDetailScreen";
import { ConnectDrawer } from "@/connect/ConnectDrawer";

const AUTH_ROUTES = [
 "/welcome",
  "/google-return",
  "/login",
  "/signup",
  "/new-user",
  "/forgot-password",
  "/reset-password",
  "/verify",
];

export default function App() {
  const [createOpen, setCreateOpen] = useState(false);
  const [createAudienceGroup, setCreateAudienceGroup] = useState("");
  const [postsVersion, setPostsVersion] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const accountName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Your profile";
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    const onServiceWorkerMessage = (event) => {
      if (event.data?.type === "notification-click") navigate("/notifications");
    };
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
  }, [navigate]);

  useEffect(() => {
    setConnectOpen(false);
  }, [pathname]);

  if (isAuth) {
    return (
      <div className="app">
        <Routes>
          <Route path="/google-return" element={<GoogleReturnScreen />} />
          <Route path="/welcome" element={<WelcomeScreen/>}/>
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
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <ToastProvider>
      <IdentityConfirmationProvider>
        <div className="app">
          <NotificationToast />
        <header className="topbar">
          <div className="brand-wrap">
            <a className="brand" href="#/home" aria-label="City4Christ home">
              <img className="logo" src="/assets/images/logo.jpeg" alt="City4Christ logo" />
              <b>City4Christ</b>
            </a>
            <button className="brand-menu" type="button" aria-label="Open Stay connected" aria-haspopup="dialog" aria-controls="connect-drawer" aria-expanded={connectOpen} onClick={() => setConnectOpen(true)}>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
          <div className="header-actions">
            <button className="header-btn" type="button" aria-label="Search" onClick={() => navigate("/search")}>
              <Icon name="search" />
            </button>
            <NotificationButton />
            <button
              className="header-profile-btn"
              type="button"
              aria-label="My profile"
              onClick={() => navigate("/profile")}
            >
              <Avatar name={accountName} src={profile?.avatar?.url} size={38} />
            </button>
          </div>
        </header>
        <ConnectDrawer open={connectOpen} onClose={closeConnect} />

        <main className="screens">
          <Routes>
            <Route path="/video-test" element={<VideoTestScreen />} />
            <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
            <Route path="/visitors" element={<ProtectedRoute><AdminShell><VisitorsScreen/></AdminShell></ProtectedRoute>}/>
            <Route path="/account-deletion-requests" element={<ProtectedRoute><AdminShell><DeletionRequestsScreen /></AdminShell></ProtectedRoute>} />
            <Route path="/admin/members" element={<ProtectedRoute><AdminShell><AdminMemberSearch /></AdminShell></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/live" element={<ProtectedRoute><AdminShell><BroadcastManager /></AdminShell></ProtectedRoute>} />
            <Route path="/admin/sermons" element={<ProtectedRoute><AdminShell><SermonPublishingScreen /></AdminShell></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><AdminShell><AdminEventsScreen /></AdminShell></ProtectedRoute>} />
            <Route path="/admin/communications" element={<ProtectedRoute><AdminShell><AdminCommunicationsScreen /></AdminShell></ProtectedRoute>} />
            <Route path="/admin/prayer-reports" element={<ProtectedRoute><AdminShell><AdminPrayerReportsScreen /></AdminShell></ProtectedRoute>} />
            <Route path="/pastor-dashboard" element={<ProtectedRoute><PastorDashboardScreen /></ProtectedRoute>} />
            <Route path="/pastor-availability" element={<ProtectedRoute><PastorAvailabilityScreen /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityScreen /></ProtectedRoute>} />
            <Route path="/live" element={<ProtectedRoute><LiveScreen /></ProtectedRoute>} />
            <Route path="/get-app" element={<ProtectedRoute><GetAppScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
 <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomeScreen refreshKey={postsVersion} />
                </ProtectedRoute>
              }
            />
            <Route path="/word" element={<WordScreen />} />
            <Route path="/bible" element={<BibleScreen />} />
            <Route
              path="/devotionals"
              element={
                <ProtectedRoute>
                  <DevotionalsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pastors"
              element={
                <ProtectedRoute>
                  <PastorsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/posts"
              element={
                <ProtectedRoute>
                  <GroupPostsScreen refreshKey={postsVersion} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/events"
              element={
                <ProtectedRoute>
                  <GroupEventsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts"
              element={
                <ProtectedRoute>
                  <PostsScreen refreshKey={postsVersion} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <MessagesScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <MemberDirectoryScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/settings"
              element={
                <ProtectedRoute>
                  <NotificationSettingsScreen />
                </ProtectedRoute>
              }
            />
            <Route path="/giving/return" element={<GivingReturnScreen />} />
            <Route
              path="/giving"
              element={
                <ProtectedRoute>
                  <GivingScreen />
                </ProtectedRoute>
              }
            />
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
              element={
                <ProtectedRoute>
                  <AdminShell><GroupAdminScreen /></AdminShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/manage/:groupId"
              element={
                <ProtectedRoute>
                  <AdminShell><GroupAdminScreen /></AdminShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupsScreen />
                </ProtectedRoute>
              }
            />
            <Route path="/events" element={<EventsScreen />} />
            <Route path="/events/:eventId" element={<EventDetailScreen />} />
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

        <Nav
          onFab={() => {
            setCreateAudienceGroup(
              pathname.match(/^\/groups\/[^/]+\/posts$/)
                ? pathname.split("/")[2]
                : "",
            );
            setCreateOpen(true);
          }}
        />

        <CreateSheet
          key={createAudienceGroup}
          open={createOpen}
          audienceLabel={
            createAudienceGroup
              ? "Sharing with this group"
              : "Sharing with the church"
          }
          onClose={() => setCreateOpen(false)}
          onPost={async ({ body, files, setUploadStatus }) => {
            const attachmentIds = [];
            for (const file of files)
              attachmentIds.push(
                await uploadPostMedia(file, { onStatus: setUploadStatus }),
              );
            await createPost({
              body,
              ...(createAudienceGroup ? { groupId: createAudienceGroup } : {}),
              ...(attachmentIds.length ? { attachmentIds } : {}),
            });
            setPostsVersion((value) => value + 1);
          }}
        />
        </div>
      </IdentityConfirmationProvider>
    </ToastProvider>
  );
}
