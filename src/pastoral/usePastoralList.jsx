import { useEffect, useRef, useState } from "react";
import { api } from "@/auth/session";
export function usePastoralList(path, revision) {
  const [items, setItems] = useState([]),
    [cursor, setCursor] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    abort = useRef(null);
  async function load(after, replace, version) {
    setBusy(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("cursor", after);
      const result = await api.request(
        path + (path.includes("?") ? "&" : "?") + qs,
        { signal: abort.current.signal },
      );
      if (version !== generation.current) return;
      setItems((previous) =>
        replace ? result.data : [...previous, ...result.data],
      );
      setCursor(result.meta.nextCursor);
    } catch (e) {
      if (version === generation.current && e.name !== "AbortError")
        setError(e.message || "Could not load appointments.");
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const version = ++generation.current;
    abort.current = new AbortController();
    setItems([]);
    setCursor("");
    if (path) void load("", true, version);
    else {
      setBusy(false);
      setError("");
    }
    return () => {
      generation.current++;
      abort.current.abort();
    };
  }, [path, revision]);
  return {
    items,
    busy,
    error,
    more: cursor ? () => load(cursor, false, generation.current) : null,
  };
}
export function ListState({ state }) {
  return (
    <>
      {state.error && <p role="alert">{state.error}</p>}
      {state.busy && <p role="status">Loading…</p>}
      {state.more && (
        <button className="btn soft" disabled={state.busy} onClick={state.more}>
          Load more
        </button>
      )}
    </>
  );
}
