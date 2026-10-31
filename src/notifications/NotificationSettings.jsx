import "./notifications.css";
import React, { useEffect, useState } from "react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  getPushConfig,
  savePushSubscription,
  removePushSubscription,
} from "./api";
import { subscribeDevice, currentDeviceSubscription } from "./push";
const categories = [
  ["groups", "Group updates"],
  ["events", "Event updates"],
  ["pastoral", "Pastoral appointment updates"],
  ["messages", "Message updates"],
  ["announcements", "Church and group announcements"],
];
export function NotificationSettings() {
  const [prefs, setPrefs] = useState(null),
    [config, setConfig] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([getNotificationPreferences(), getPushConfig()])
      .then(([p, c]) => {
        if (live) {
          setPrefs(p);
          setConfig(c);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setPrefs(await saveNotificationPreferences(prefs));
      setNotice("Notification preferences saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function enable() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const sub = await subscribeDevice(config.publicKey);
      await savePushSubscription(sub.toJSON());
      const p = await saveNotificationPreferences({
        ...prefs,
        pushEnabled: true,
      });
      setPrefs(p);
      setNotice("Notifications enabled on this device.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const sub = await currentDeviceSubscription();
      if (sub) {
        try {
          await removePushSubscription(sub.endpoint);
        } finally {
          await sub.unsubscribe();
        }
      }
      setNotice("Notifications disabled on this device.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const supported =
    typeof Notification !== "undefined" &&
    Boolean(navigator.serviceWorker) &&
    "PushManager" in window;
  return (
    <section
      className="auth-card notification-settings"
      aria-label="Notification settings"
    >
      <h2>Notification settings</h2>
      <p>
        Your in-app inbox stays available. These preferences control push
        notifications; previews contain no private details.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {prefs ? (
        <form aria-label="Notification preferences" onSubmit={save}>
          <label>
            <input
              type="checkbox"
              checked={prefs.pushEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, pushEnabled: e.target.checked })
              }
            />
            Push on my subscribed devices
          </label>
          {categories.map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) =>
                  setPrefs({ ...prefs, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <button className="btn soft" disabled={busy}>
            Save preferences
          </button>
        </form>
      ) : (
        !error && <p role="status">Loading notification settings…</p>
      )}
      {config && !config.enabled ? (
        <p>Browser push is not configured yet.</p>
      ) : (
        config &&
        prefs && (
          <>
            <p>
              {supported
                ? "Enable notifications only on a device you use."
                : "This browser cannot receive push here. Some phones require installing the PWA first."}
            </p>
            <div className="devotional-actions">
              <button
                className="btn gold"
                disabled={busy || !supported}
                onClick={enable}
              >
                Enable notifications on this device
              </button>
              <button
                className="btn soft"
                disabled={busy || !supported}
                onClick={disable}
              >
                Disable notifications on this device
              </button>
            </div>
          </>
        )
      )}
    </section>
  );
}
