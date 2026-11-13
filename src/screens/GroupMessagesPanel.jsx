import { RefreshButton } from "@/components/RefreshButton";
import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/Avatar";
import RealtimeStatus from "@/messages/RealtimeStatus";
import MessageComposer from "@/messages/MessageComposer";
import MessageAttachments from "@/messages/MessageAttachments";
import MessageActionsMenu, { copyMessageText } from "@/messages/MessageActionsMenu";
import { mergeMessageHistory } from "@/messages/realtimeClient";
import { useRealtimeMessages } from "@/messages/useRealtimeMessages";
import {
  deleteGroupMessage,
  listGroupConversations,
  listGroupMessages,
  markGroupConversationRead,
  sendGroupMessage,
} from "@/messages/groupApi";
import { messageGroupPosition } from "@/messages/messageGrouping";

function timeLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
}

export default function GroupMessagesPanel() {
  const { profile } = useSession();
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [activeMessageQuery, setActiveMessageQuery] = useState("");
  const [typingSenders, setTypingSenders] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState(() => new Set());
  const [presenceKnown, setPresenceKnown] = useState(false);
  const [onlineMemberCount, setOnlineMemberCount] = useState(0);
  const typingTimers = useRef(new Map());
  const pendingIDs = useRef(new Map());
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
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

  const syncGroups = useCallback(async () => {
    try { setGroups(await listGroupConversations()); } catch {}
  }, []);

  const syncGroupThread = useCallback(async (groupId) => {
    if (activeMessageQuery) return;
    try {
      const page = await listGroupMessages(groupId);
      if (selectedIdRef.current !== groupId) return;
      setMessages((current) => mergeMessageHistory(current, page.messages));
      const latest = page.messages.at(-1);
      if (latest) {
        await markGroupConversationRead(groupId, latest.id);
        setGroups((current) => current.map((item) => item.groupId === groupId
          ? { ...item, unreadCount: 0, myLastReadSequence: Math.max(item.myLastReadSequence || 0, latest.sequence) }
          : item));
      }
    } catch {}
  }, [activeMessageQuery]);

  const onRealtimeEvent = useCallback((event) => {
    if (event.scope !== "group") return;
    if (event.type === "presence.snapshot" || event.type === "presence.online" || event.type === "presence.offline") {
      if (event.groupId !== selectedIdRef.current) return;
      setPresenceKnown(true);
      setOnlineMemberCount(event.onlineCount);
      return;
    }
    if (event.type === "typing.start" || event.type === "typing.stop") {
      if (event.groupId !== selectedIdRef.current || event.senderId === profile?.id) return;
      clearTimeout(typingTimers.current.get(event.senderId));
      setTypingSenders((current) => {
        const next = new Set(current);
        if (event.type === "typing.start") next.add(event.senderId);
        else next.delete(event.senderId);
        return next;
      });
      if (event.type === "typing.start") {
        typingTimers.current.set(event.senderId, setTimeout(() => {
          typingTimers.current.delete(event.senderId);
          setTypingSenders((current) => { const next = new Set(current); next.delete(event.senderId); return next; });
        }, 3500));
      } else typingTimers.current.delete(event.senderId);
      return;
    }
    void syncGroups();
    if (event.groupId === selectedIdRef.current) void syncGroupThread(event.groupId);
  }, [profile?.id, syncGroups, syncGroupThread]);

  const onRealtimeReady = useCallback(() => {
    void syncGroups();
    const groupId = selectedIdRef.current;
    if (groupId) void syncGroupThread(groupId);
  }, [syncGroups, syncGroupThread]);

  const realtime = useRealtimeMessages({
    enabled: Boolean(profile?.id),
    onEvent: onRealtimeEvent,
    onReady: onRealtimeReady,
  });
  useEffect(() => {
    if (!selectedId || realtime.status !== "connected") return undefined;
    const target = { scope: "group", groupId: selectedId };
    const refresh = () => realtime.send({ type: "presence.subscribe", ...target });
    refresh();
    const timer = setInterval(refresh, 20000);
    return () => { clearInterval(timer); realtime.send({ type: "presence.unsubscribe", ...target }); };
  }, [selectedId, realtime.status, realtime.send]);
  useEffect(() => () => { for (const timer of typingTimers.current.values()) clearTimeout(timer); }, []);

  const openGroup = useCallback(async (group) => {
    selectedIdRef.current = group.groupId;
    setSelectedId(group.groupId);
    setMessages([]);
    setMessageQuery("");
    setActiveMessageQuery("");
    setTypingSenders(new Set());
    setPresenceKnown(false);
    setOnlineMemberCount(0);
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

  async function searchCurrentGroup(event) {
    event.preventDefault();
    const query = messageQuery.trim();
    if (!selected || query.length < 2 || threadLoading) return;
    setThreadLoading(true);
    setThreadError("");
    try {
      const page = await listGroupMessages(selected.groupId, { query });
      setMessages(page.messages);
      setActiveMessageQuery(query);
    } catch (err) {
      setThreadError(err.message || "Could not search this group conversation.");
    } finally {
      setThreadLoading(false);
    }
  }

  async function submit({ body, attachmentIds }) {
    if (!selected || !body.trim() || sending) return false;
    const idempotencyKey = JSON.stringify([body.trim(), attachmentIds]);
    const clientMessageId = pendingIDs.current.get(idempotencyKey) || crypto.randomUUID();
    pendingIDs.current.set(idempotencyKey, clientMessageId);
    setSending(true);
    realtime.send({ type: "typing.stop", scope: "group", groupId: selected.groupId });
    setTypingSenders(new Set());
    setThreadError("");
    try {
      const message = await sendGroupMessage(selected.groupId, body, clientMessageId, attachmentIds);
      pendingIDs.current.delete(idempotencyKey);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].sort((a, b) => a.sequence - b.sequence));
      setGroups((current) => current.map((item) => item.groupId === selected.groupId ? { ...item, lastMessage: message, unreadCount: 0 } : item));
      setReplyingTo(null);
      return true;
    } catch (err) {
      setThreadError(err.message || "Message could not be sent. Retry when you are back online.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(message) {
    if (!selected || message.deleted || selected.canModerate !== true) return;
    if (!window.confirm("Remove this message for everyone in the group?")) return;
    setThreadError("");
    try {
      await deleteGroupMessage(selected.groupId, message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: "", attachments: [], attachmentCount: 0, deleted: true } : item));
      setGroups((current) => current.map((group) => group.groupId === selected.groupId && group.lastMessage?.id === message.id
        ? { ...group, lastMessage: { ...group.lastMessage, body: "", attachments: [], attachmentCount: 0, deleted: true } }
        : group));
    } catch (err) {
      setThreadError(err.message || "Message could not be removed.");
    }
  }

  async function cutOwnMessage(message) {
    if (selected?.canModerate !== true || !await copyMessageText(message)) return;
    await removeMessage(message);
  }

  function togglePinned(message) {
    setPinnedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(message.id)) next.delete(message.id); else next.add(message.id);
      return next;
    });
  }

  return (
    <section className={`group-chat-panel${selected ? " has-selection" : ""}`} aria-label="Group chats">
      <aside className="messages-list-panel" aria-label="Church group conversations">
        <div className="messages-title-row"><div><p className="group-eyebrow">CHURCH GROUPS</p><h2>Group chats</h2><RealtimeStatus status={realtime.status} /></div><RefreshButton className="btn soft" type="button" onClick={() => refresh()} disabled={loading} label="Refresh" /></div>
        {error && <p className="messages-error" role="alert">{error}</p>}
        {loading ? <p className="messages-state" role="status">Loading group chats…</p> : !error && groups.length === 0 ? <p className="messages-empty">No group chats are available. Join a church group to see its chat.</p> : null}
        <ul className="conversation-list">
          {groups.map((group) => <li key={group.groupId}><button type="button" className={`conversation-row${group.groupId === selectedId ? " active" : ""}`} aria-label={`Open group conversation ${group.groupName}`} aria-pressed={group.groupId === selectedId} onClick={() => void openGroup(group)}>
            <span className="group-chat-avatar" aria-hidden="true">{group.groupName.slice(0, 1).toUpperCase()}</span>
            <span className="conversation-row-main"><span className="conversation-row-top"><strong>{group.groupName}</strong></span><span className="conversation-row-preview">{group.lastMessage?.deleted ? "Message removed" : group.lastMessage?.body || (group.lastMessage?.attachmentCount ? "Attachment" : "Start the group conversation")}</span></span>
            {group.unreadCount > 0 && <span className="conversation-unread" aria-label={`${group.unreadCount} unread messages`}>{group.unreadCount}</span>}
          </button></li>)}
        </ul>
      </aside>
      <section className="message-thread" aria-label="Group conversation">
        {!selected ? <div className="message-thread-placeholder"><p>Choose one of your church group conversations.</p></div> : <>
          <header className="message-thread-header"><button type="button" className="messages-back" onClick={() => { selectedIdRef.current = ""; setSelectedId(""); }} aria-label="Back to group chats">Back</button><span className="group-chat-avatar" aria-hidden="true">{selected.groupName.slice(0, 1).toUpperCase()}</span><div><h2>{selected.groupName}</h2><p>{presenceKnown ? `${onlineMemberCount} members online` : selected.audience === "leadership" ? "Leadership group conversation" : "Church group conversation"}</p></div></header>
          <form className="message-search-form" onSubmit={searchCurrentGroup} role="search" aria-label="Search this group chat">
            <label className="sr-only" htmlFor="group-message-search">Search group messages</label>
            <input id="group-message-search" type="search" aria-label="Search group messages" minLength={2} maxLength={120} value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search group messages" />
            <button className="btn soft" type="submit" disabled={threadLoading || messageQuery.trim().length < 2}>Search</button>
            {activeMessageQuery && <button className="btn soft" type="button" onClick={() => { setMessageQuery(""); setActiveMessageQuery(""); void openGroup(selected); }}>Clear</button>}
          </form>
          {activeMessageQuery && <p className="messages-muted">Search results for “{activeMessageQuery}”</p>}
          {threadError && <div className="messages-error thread-error" role="alert"><span>{threadError}</span><button className="btn soft" type="button" onClick={() => void openGroup(selected)}>Try again</button></div>}
          {threadLoading && <p role="status" className="messages-state">Loading group messages…</p>}
          <div className="message-history" aria-live="polite">
            {messages.length === 0 && !threadLoading && !threadError && <p className="messages-empty thread-empty">Start the group conversation.</p>}
            {messages.map((message, index) => { const sent = message.senderId === profile?.id; const { first, last } = messageGroupPosition(messages, index); const author = [message.senderFirstName, message.senderLastName].filter(Boolean).join(" ") || "Group member"; return <div key={message.id} className={`message-row ${sent ? "sent" : "received"} ${first ? "group-start" : "group-continued"} ${last ? "group-end" : "group-middle"}`}>
              <MessageActionsMenu message={message} own={sent} canDelete={selected.canModerate === true} pinned={pinnedMessageIds.has(message.id)} className={first ? "group-start" : "group-continued"} onDelete={() => removeMessage(message)} onReply={() => setReplyingTo(message)} onPin={() => togglePinned(message)} onCut={() => cutOwnMessage(message)}><article className={`message-bubble${sent ? " sent" : " received"}${message.deleted ? " removed" : ""}`}>
              {!sent && (first || (message.senderAvatar?.url && !messages[index - 1]?.senderAvatar?.url)) && <div className="group-message-author"><Avatar name={author} src={message.senderAvatar?.url} size={24} /><span>{author}</span></div>}
              {message.deleted ? <p>This message was removed by a group moderator.</p> : <>{message.body && <p className="message-text">{message.body}</p>}<MessageAttachments items={message.attachments} /></>}
              <span className="message-meta"><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></span>
            </article></MessageActionsMenu>
            </div>; })}
          </div>
          {typingSenders.size > 0 && <p className="message-typing-indicator" role="status"><span className="typing-dots" aria-hidden="true"><i /><i /><i /></span><span>{typingSenders.size === 1 ? "A group member is typing" : "Group members are typing"}</span></p>}
          {replyingTo && <div className="message-reply-preview"><span><strong>Replying to</strong> {replyingTo.body?.slice(0, 100) || "Attachment"}</span><button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">×</button></div>}
          <MessageComposer key={`${selected.groupId}:${replyingTo?.id || "new"}`} initialBody={replyingTo ? `> ${replyingTo.body || "Attachment"}\n\n` : ""} label="Send a group message" placeholder="Write to the group…" disabled={sending} onSend={submit} onTyping={(active) => realtime.send({ type: active ? "typing.start" : "typing.stop", scope: "group", groupId: selected.groupId })} />
        </>}
      </section>
    </section>
  );
}
