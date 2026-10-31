import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { DevotionalReader } from "@/devotionals/DevotionalReader";
import { DevotionalEditor } from "@/devotionals/DevotionalEditor";
import "@/devotionals/devotionals.css";
export default function DevotionalsScreen() {
  const [revision, setRevision] = useState(0),
    [editor, setEditor] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api
      .request("/api/v1/me/access")
      .then(({ data }) => {
        if (live) {
          setEditor(hasCapability(data, "devotionals.manage"));
          setError("");
        }
      })
      .catch((e) => {
        if (live) {
          setEditor(false);
          setError(e.message);
        }
      });
    return () => {
      live = false;
    };
  }, [revision]);
  const reload = () => setRevision((v) => v + 1);
  return (
    <section
      className="screen active devotionals-screen"
      aria-label="Devotionals"
    >
      <h1>Devotionals</h1>
      <p>Read and reflect on published messages from City4Christ.</p>
      <button className="btn soft" onClick={reload}>
        Reload devotionals
      </button>
      {error && <p role="alert">{error}</p>}
      <DevotionalReader revision={revision} />
      {editor && <DevotionalEditor revision={revision} onChange={reload} />}
    </section>
  );
}
