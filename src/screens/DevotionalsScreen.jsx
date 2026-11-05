import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { DailyVerseEditor } from "@/dailyverse/DailyVerseEditor";
import { DevotionalReader } from "@/devotionals/DevotionalReader";
import { DevotionalEditor } from "@/devotionals/DevotionalEditor";
import "@/devotionals/devotionals.css";
export default function DevotionalsScreen() {
  const [revision, setRevision] = useState(0),
    [editor, setEditor] = useState(false),
    [view, setView] = useState("read"),
    [managementDirty, setManagementDirty] = useState(false),
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
  useEffect(() => {
    if (!editor) setView("read");
  }, [editor]);
  const reload = () => setRevision((v) => v + 1);
  const views = [
    ["read", "Read"],
    ["manage", "Manage devotionals"],
    ["daily", "Daily verse"],
  ];
  function changeView(id, focus = false) {
    if (view === "manage" && id !== "manage" && managementDirty && !window.confirm("You have unsaved changes. Leave the management workspace?")) return;
    if (id !== "manage") setManagementDirty(false);
    setView(id);
    if (focus) setTimeout(() => document.getElementById(`devotional-tab-${id}`)?.focus(), 0);
  }
  return (
    <section
      className="screen active devotionals-screen"
      aria-label="Devotionals"
    >
      <header className="devotionals-header">
        <div>
          <p className="devotionals-eyebrow">CITY4CHRIST COMMUNITY</p>
          <h1>Devotionals</h1>
          <p>Read and reflect on messages from City4Christ.</p>
        </div>
        <button className="btn soft devotional-refresh" onClick={reload}>
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {editor && (
        <div className="devotional-view-tabs" role="tablist" aria-label="Devotional workspaces">
          {views.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`devotional-tab-${id}`}
              aria-selected={view === id}
              aria-controls={`devotional-panel-${id}`}
              tabIndex={view === id ? 0 : -1}
              className={view === id ? "is-active" : ""}
              onClick={() => changeView(id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  changeView(views[(views.findIndex(([value]) => value === id) + 1) % views.length][0], true);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  changeView(views[(views.findIndex(([value]) => value === id) - 1 + views.length) % views.length][0], true);
                }
              }}
            >{label}</button>
          ))}
        </div>
      )}
      {view === "read" && <div id="devotional-panel-read" role={editor ? "tabpanel" : undefined} className="devotional-workspace"><DevotionalReader revision={revision} /></div>}
      {editor && view === "manage" && <div id="devotional-panel-manage" role="tabpanel" className="devotional-workspace"><DevotionalEditor revision={revision} onChange={reload} onDirty={setManagementDirty} /></div>}
      {editor && view === "daily" && <div id="devotional-panel-daily" role="tabpanel" className="devotional-workspace"><DailyVerseEditor revision={revision} onChange={reload}/></div>}
    </section>
  );
}
