import { useEffect, useRef, useState } from "react";
import { getTranslations, lookupPassage } from "./api";
export function useBibleLookup({
  initialReference = "",
  initialTranslation = "",
  initialTranslationName = "",
  autoLookup = true,
} = {}) {
  const [reference, setReference] = useState(initialReference),
    [translation, setTranslation] = useState("web"),
    [translations, setTranslations] = useState([]),
    [passage, setPassage] = useState(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    controller = useRef(null),
    alive = useRef(false);
  function clear() {
    generation.current++;
    controller.current?.abort();
    setPassage(null);
    setError("");
    setNotice("");
    setBusy(false);
  }
  async function search(ref = reference, id = translation) {
    const version = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setReference(ref);
    setTranslation(id);
    setPassage(null);
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await lookupPassage(ref, id, controller.current.signal);
      if (alive.current && version === generation.current) {
        setPassage(result);
        setReference(result.reference);
      }
    } catch (e) {
      if (
        alive.current &&
        version === generation.current &&
        e.name !== "AbortError"
      ) {
        const details = Object.entries({
          reference: "Bible reference",
          translation: "Bible version",
        })
          .filter(([key]) => typeof e.fields?.[key] === "string")
          .map(([key, label]) => `${label}: ${e.fields[key]}`);
        setError([e.message, ...details].join(" "));
      }
    } finally {
      if (alive.current && version === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    const metadata = new AbortController();
    clear();
    setReady(false);
    setReference(initialReference);
    getTranslations(metadata.signal)
      .then((list) => {
        if (cancelled) return;
        setTranslations(list);
        setReady(true);
        let selected = list.find((t) =>
          initialTranslation
            ? t.id === initialTranslation.toLowerCase()
            : initialTranslationName &&
              (t.name.toLowerCase() === initialTranslationName.toLowerCase() ||
                t.id === initialTranslationName.toLowerCase()),
        );
        if ((initialTranslation || initialTranslationName) && !selected) {
          setTranslation("web");
          setNotice(
            "The original version is not available here. Choose a supported version to look up this reference.",
          );
          return;
        }
        selected = selected || list.find((t) => t.id === "web") || list[0];
        if (!selected) {
          setReady(false);
          setError("No Bible versions are available.");
          return;
        }
        setTranslation(selected.id);
        if (initialReference && autoLookup)
          void search(initialReference, selected.id);
      })
      .catch((e) => {
        if (!cancelled && e.name !== "AbortError")
          setError(e.message || "Bible versions are unavailable.");
      });
    return () => {
      cancelled = true;
      alive.current = false;
      generation.current++;
      controller.current?.abort();
      metadata.abort();
    };
  }, [
    initialReference,
    initialTranslation,
    initialTranslationName,
    autoLookup,
    revision,
  ]);
  return {
    reference,
    translation,
    translations,
    passage,
    ready,
    busy,
    error,
    notice,
    search,
    changeReference: (value) => {
      clear();
      setReference(value);
    },
    changeTranslation: (value) => {
      clear();
      setTranslation(value);
    },
    reload: () => setRevision((v) => v + 1),
  };
}
