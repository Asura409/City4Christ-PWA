import { useEffect, useRef, useState } from "react";
import { getTodayVerse } from "./api";
import { nextVerseRefresh } from "./model";
export function useTodayVerse() {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    refreshRef = useRef(() => {});
  useEffect(() => {
    let alive = true,
      generation = 0,
      timer,
      controller,
      pending = false;
    async function load() {
      const version = ++generation;
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      pending = true;
      const started = performance.now();
      setData(null);
      setBusy(true);
      setError("");
      try {
        const result = await getTodayVerse(controller.signal);
        if (!alive || version !== generation) return;
        const remaining = nextVerseRefresh(result, performance.now() - started);
        if (remaining <= 0) {
          timer = setTimeout(load, 1000);
          return;
        }
        setData(result);
        timer = setTimeout(load, remaining);
      } catch (e) {
        if (alive && version === generation && e.name !== "AbortError")
          setError(e.message || "Daily verse is unavailable.");
      } finally {
        if (alive && version === generation) {
          pending = false;
          setBusy(false);
        }
      }
    }
    const visible = () => {
      if (document.visibilityState === "visible" && !pending) void load();
    };
    refreshRef.current = () => void load();
    void load();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      alive = false;
      generation++;
      controller?.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
      refreshRef.current = () => {};
    };
  }, []);
  return { data, busy, error, refresh: () => refreshRef.current() };
}
