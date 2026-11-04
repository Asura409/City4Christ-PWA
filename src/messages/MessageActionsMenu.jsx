import React, { useEffect, useRef, useState } from "react";

export async function copyMessageText(message) {
  const text = message?.body?.trim();
  if (!text) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MessageActionsMenu({ message, own = false, canDelete = false, pinned = false, onDelete, onReply, onPin, onCut, children }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  function startLongPress() { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 520); }
  function cancelLongPress() { clearTimeout(timer.current); }
  function choose(action) { setOpen(false); void action?.(); }
  if (message.deleted) return null;
  return <span ref={root} className="message-actions-anchor" onContextMenu={(event) => { event.preventDefault(); setOpen(true); }} onPointerDown={startLongPress} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}>
    {children}
    {pinned && <span className="message-pin-mark" aria-label="Pinned message" title="Pinned message">●</span>}
    {open && <span className="message-actions-menu" role="menu" aria-label="Message actions">
      <button type="button" role="menuitem" onClick={() => choose(() => copyMessageText(message))}>Copy</button>
      {own && <button type="button" role="menuitem" onClick={() => choose(onCut)}>Cut</button>}
      <button type="button" role="menuitem" onClick={() => choose(onReply)}>Reply</button>
      <button type="button" role="menuitem" onClick={() => choose(onPin)}>{pinned ? "Unpin message" : "Pin message"}</button>
      {canDelete && <button type="button" role="menuitem" className="message-action-danger" onClick={() => choose(onDelete)}>Delete</button>}
    </span>}
  </span>;
}
