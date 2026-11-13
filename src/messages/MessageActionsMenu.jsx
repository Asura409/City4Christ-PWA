import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export async function copyMessageText(message) {
  const text = message?.body?.trim();
  if (!text) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MessageActionsMenu({ message, own = false, canDelete = false, canEdit = false, pinned = false, onDelete, onEdit, onReply, onPin, onCut, className = "", children }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const root = useRef(null), menu = useRef(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) return;
    function place() {
      const anchor = root.current?.getBoundingClientRect(), panel = menu.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      const width = window.innerWidth, height = window.innerHeight;
      const top = anchor.top >= panel.height + 8 ? anchor.top - panel.height - 7 : anchor.bottom + 7;
      setPosition({ left: Math.max(8, Math.min(anchor.right - panel.width, width - panel.width - 8)), top: Math.max(8, Math.min(top, height - panel.height - 8)) });
    }
    place();
    menu.current.querySelector("button")?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, canDelete, canEdit, pinned, own]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!root.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); root.current?.focus({ preventScroll: true }); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  function startLongPress() { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 520); }
  function cancelLongPress() { clearTimeout(timer.current); }
  function choose(action) { setOpen(false); void action?.(); }
  if (message.deleted) return children;
  return <span ref={root} tabIndex={0} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); setOpen(true); } }} className={`message-actions-anchor ${className}`.trim()} onContextMenu={(event) => { event.preventDefault(); setOpen(true); }} onPointerDown={startLongPress} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}>
    {children}
    {pinned && <span className="message-pin-mark" aria-label="Pinned message" title="Pinned message">●</span>}
    {open && createPortal(<span ref={menu} className="message-actions-menu" role="menu" aria-label="Message actions" style={{ position: "fixed", left: position.left, top: position.top, right: "auto", bottom: "auto", zIndex: 180 }}>
      <button type="button" role="menuitem" onClick={() => choose(() => copyMessageText(message))}>Copy</button>
      {own && canDelete && onCut && <button type="button" role="menuitem" onClick={() => choose(onCut)}>Cut</button>}
      {own && canEdit && <button type="button" role="menuitem" onClick={() => choose(onEdit)}>Edit message</button>}
      <button type="button" role="menuitem" onClick={() => choose(onReply)}>Reply</button>
      <button type="button" role="menuitem" onClick={() => choose(onPin)}>{pinned ? "Unpin message" : "Pin message"}</button>
      {canDelete && <button type="button" role="menuitem" className="message-action-danger" onClick={() => choose(onDelete)}>Delete</button>}
    </span>, document.body)}
  </span>;
}
