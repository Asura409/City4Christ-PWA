import { useEffect, useRef, useState } from "react";
import { api } from "@/auth/session";
export function useContentList(path, revision, publicRead = false) {
  const [items, setItems] = useState([]),
    [cursor, setCursor] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    controller = useRef(null);
  async function load(after, replace, version) {
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (after) query.set("cursor", after);
      const result = await api.request(path + "?" + query, {
        public: publicRead,
        signal: controller.current.signal,
      });
      if (version !== generation.current) return;
      setItems((old) => (replace ? result.data : [...old, ...result.data]));
      setCursor(result.meta.nextCursor);
    } catch (e) {
      if (version === generation.current && e.name !== "AbortError")
        setError(e.message || "Could not load content.");
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const version = ++generation.current;
    controller.current = new AbortController();
    setItems([]);
    setCursor("");
    void load("", true, version);
    return () => {
      generation.current++;
      controller.current.abort();
    };
  }, [path, publicRead, revision]);
  return {
    items,
    busy,
    error,
    more: cursor ? () => load(cursor, false, generation.current) : null,
  };
}
export function ContentListState({ state, label = "Loading content…" }) {
  return (
    <>
      {state.busy && <p role="status">{label}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.more && (
        <button className="btn soft" disabled={state.busy} onClick={state.more}>
          Load more
        </button>
      )}
    </>
  );
}
