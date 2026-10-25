import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/auth/session";
import {
  deleteGroupMessage,
  listGroupConversations,
  listGroupMessages,
  markGroupConversationRead,
  sendGroupMessage,
} from "@/messages/groupApi";

function timeLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function GroupMessagesPanel() {
  const { profile } = useSession();
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [threadError, setThreadError] = useState("");
  const pendingIDs = useRef(new Map());
  const selected = groups.find((group) => group.groupId === selectedId) || null;

  const refresh = useCallback(async (signal) => {
    setError("");
    setLoading(true);
    try {
      setGroups(await listGroupConversations({ signal }));
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Could not load group chats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const openGroup = useCallback(async (group) => {
    setSelectedId(group.groupId);
    setMessages([]);
    setThreadError("");
    setThreadLoading(true);
    try {
      const page = await listGroupMessages(group.groupId);
      setMessages(page.messages);
      const latest = page.messages.at(-1);
      if (latest) {
        await markGroupConversationRead(group.groupId, latest.id);
        setGroups((current) => current.map((item) => item.groupId === group.groupId
          ? { ...item, unreadCount: 0, myLastReadSequence: Math.max(item.myLastReadSequence || 0, latest.sequence) }
          : item));
      }
    } catch (err) {
      setThreadError(err.message || "Could not load group messages.");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body || sending) return;
    const clientMessageId = pendingIDs.current.get(body) || crypto.randomUUID();
    pendingIDs.current.set(body, clientMessageId);
    setSending(true);
    setThreadError("");
    try {
      const message = await sendGroupMessage(selected.groupId, body, clientMessageId);
      pendingIDs.current.delete(body);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].sort((a, b) => a.sequence - b.sequence));
      setGroups((current) => current.map((item) => item.groupId === selected.groupId ? { ...item, lastMessage: message, unreadCount: 0 } : item));
      setDraft("");
    } catch (err) {
      setThreadError(err.message || "Message could not be sent. Retry when you are back online.");
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(message) {
    if (!selected || message.deleted) return;
    setThreadError("");
    try {
      await deleteGroupMessage(selected.groupId, message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: "", deleted: true } : item));
      setGroups((current) => current.map((group) => group.groupId === selected.groupId && group.lastMessage?.id === message.id
        ? { ...group, lastMessage: { ...group.lastMessage, body: "", deleted: true } }
        : group));
    } catch (err) {
      setThreadError(err.message || "Message could not be removed.");
    }
  }

  return (
    <section className={`group-chat-panel${selected ? " has-selection" : ""}`} aria-label="Group chats">
      <aside className="messages-list-panel" aria-label="Church group conversations">
        <div className="messages-title-row"><div><p className="group-eyebrow">CHURCH GROUPS</p><h2>Group chats</h2></div><button className="btn soft" type="button" onClick={() => void refresh()} disabled={loading}>Refresh</button></div>
        {error && <p className="messages-error" role="alert">{error}</p>}
        {loading ? <p className="messages-state" role="status">Loading group chats…</p> : !error && groups.length === 0 ? <p className="messages-empty">No group chats are available. Join a church group to see its chat.</p> : null}
        <ul className="conversation-list">
          {groups.map((group) => <li key={group.groupId}><button type="button" className={`conversation-row${group.groupId === selectedId ? " active" : ""}`} aria-label={`Open group conversation ${group.groupName}`} aria-pressed={group.groupId === selectedId} onClick={() => void openGroup(group)}>
            <span className="group-chat-avatar" aria-hidden="true">{group.groupName.slice(0, 1).toUpperCase()}</span>
            <span className="conversation-row-main"><span className="conversation-row-top"><strong>{group.groupName}</strong></span><span className="conversation-row-preview">{group.lastMessage?.deleted ? "Message removed" : group.lastMessage?.body || "Start the group conversation"}</span></span>
            {group.unreadCount > 0 && <span className="conversation-unread" aria-label={`${group.unreadCount} unread messages`}>{group.unreadCount}</span>}
          </button></li>)}
        </ul>
      </aside>
      <section className="message-thread" aria-label="Group conversation">
        {!selected ? <div className="message-thread-placeholder"><p>Choose one of your church group conversations.</p></div> : <>
          <header className="message-thread-header"><button type="button" className="messages-back" onClick={() => setSelectedId("")} aria-label="Back to group chats">Back</button><span className="group-chat-avatar" aria-hidden="true">{selected.groupName.slice(0, 1).toUpperCase()}</span><div><h2>{selected.groupName}</h2><p>{selected.audience === "leadership" ? "Leadership group conversation" : "Church group conversation"}</p></div></header>
          {threadError && <div className="messages-error thread-error" role="alert"><span>{threadError}</span><button className="btn soft" type="button" onClick={() => void openGroup(selected)}>Try again</button></div>}
          {threadLoading && <p role="status" className="messages-state">Loading group messages…</p>}
          <div className="message-history" aria-live="polite">
            {messages.length === 0 && !threadLoading && !threadError && <p className="messages-empty thread-empty">Start the group conversation.</p>}
            {messages.map((message) => <article key={message.id} className={`message-bubble${message.senderId !== profile?.id ? " received" : " sent"}${message.deleted ? " removed" : ""}`}>
              {message.deleted ? <p>This message was removed by a group moderator.</p> : <><p>{message.senderId === profile?.id ? "You" : "Group member"}</p><p>{message.body}</p></>}
              <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
              {selected.canModerate && !message.deleted && <button type="button" className="group-message-delete" aria-label="Delete message" onClick={() => void removeMessage(message)}>Delete</button>}
            </article>)}
          </div>
          <form className="message-composer" aria-label="Send a group message" onSubmit={submit}><label className="sr-only" htmlFor="group-message-body">Group message</label><textarea id="group-message-body" aria-label="Group message" value={draft} maxLength={4000} rows={2} placeholder="Write to the group…" onChange={(event) => setDraft(event.target.value)} /><button className="btn dark" type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button></form>
        </>}
      </section>
    </section>
  );
}
