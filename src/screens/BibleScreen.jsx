import React from "react";
import { useLocation } from "react-router-dom";
import { PassageLookup } from "@/bible/PassageLookup";
export default function BibleScreen() {
  const { search } = useLocation(),
    q = new URLSearchParams(search);
  return (
    <section className="screen active bible-screen" aria-label="Bible">
      <h1>Bible</h1>
      <p>Look up a verse, passage or chapter and choose a supported version.</p>
      <div className="auth-card">
        <PassageLookup
          initialReference={q.get("reference") || ""}
          initialTranslation={q.get("translation") || ""}
          initialTranslationName={q.get("translationName") || ""}
        />
      </div>
    </section>
  );
}
