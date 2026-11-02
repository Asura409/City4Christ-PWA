import React, { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/auth/session";
import RealtimeStatus from "@/messages/RealtimeStatus";
import MessageComposer from "@/messages/MessageComposer";
import MessageAttachments from "@/messages/MessageAttachments";
import { mergeMessageHistory } from "@/messages/realtimeClient";
import { useRealtimeMessages } from "@/messages/useRealtimeMessages";
import {
  createConversation,
  deleteMessage,
  editMessage,
  listConversations,
  listMessages,
  markConversationRead,
  searchDirectoryMembers,
  sendMessage,
} from "@/messages/api";
import GroupMessagesPanel from "@/screens/GroupMessagesPanel";
import "@/messages/messages.css";

function nameOf(value) {
  return [value?.partnerFirstName ?? value?.firstName, value?.partnerLastName ?? value?.lastName]
    .filter(Boolean)
    .join(" ") || "Church member";
}

function timeLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function MessagesScreen() {
  const { profile } = useSession();
  const [view, setView] = useState("direct");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [activeMessageQuery, setActiveMessageQuery] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editBody, setEditBody] = useState("");
  const [clientTime, setClientTime] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [presenceKnown, setPresenceKnown] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const typingTimer = useRef(null);
  const pendingClientIDs = useRef(new Map());
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const refreshConversations = useCallback(async (signal) => {
    setConversationError("");
    setLoading(true);
    try {
      setConversations(await listConversations({ signal }));
    } catch (error) {
      if (error.name !== "AbortError") setConversationError(error.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncConversations = useCallback(async () => {
    try { setConversations(await listConversations()); } catch {}
  }, []);

  const syncThread = useCallback(async (conversationId) => {
    if (activeMessageQuery) return;
    try {
      const page = await listMessages(conversationId);
      if (selectedIdRef.current !== conversationId) return;
      setMessages((current) => mergeMessageHistory(current, page.messages));
      setHasOlder(page.nextBeforeSequence > 0);
      const latest = page.messages.at(-1);
      if (latest) {
        await markConversationRead(conversationId, latest.id);
        setConversations((current) => current.map((item) => item.id === conversationId
          ? { ...item, unreadCount: 0, myLastReadSequence: Math.max(item.myLastReadSequence || 0, latest.sequence) }
          : item));
      }
    } catch {}
  }, [activeMessageQuery]);

  const onRealtimeEvent = useCallback((event) => {
    if (event.scope !== "direct") return;
    if (event.type === "presence.snapshot" || event.type === "presence.online" || event.type === "presence.offline") {
      if (event.conversationId !== selectedIdRef.current) return;
      setPresenceKnown(true);
      setPartnerOnline(event.online);
      return;
    }
    if (event.type === "typing.start" || event.type === "typing.stop") {
      if (event.conversationId !== selectedIdRef.current || event.senderId === profile?.id) return;
      clearTimeout(typingTimer.current);
      setPartnerTyping(event.type === "typing.start");
      if (event.type === "typing.start") typingTimer.current = setTimeout(() => setPartnerTyping(false), 3500);
      return;
    }
    void syncConversations();
    if (event.conversationId === selectedIdRef.current) void syncThread(event.conversationId);
  }, [profile?.id, syncConversations, syncThread]);

  const onRealtimeReady = useCallback(() => {
    void syncConversations();
    const conversationId = selectedIdRef.current;
    if (conversationId) void syncThread(conversationId);
  }, [syncConversations, syncThread]);

  const realtime = useRealtimeMessages({
    enabled: Boolean(profile?.id) && view === "direct",
    onEvent: onRealtimeEvent,
    onReady: onRealtimeReady,
  });
  useEffect(() => {
    if (!selectedId || realtime.status !== "connected") return undefined;
    const target = { scope: "direct", conversationId: selectedId };
    const refresh = () => realtime.send({ type: "presence.subscribe", ...target });
    refresh();
    const timer = setInterval(refresh, 20000);
    return () => { clearInterval(timer); realtime.send({ type: "presence.unsubscribe", ...target }); };
  }, [selectedId, realtime.status, realtime.send]);
  useEffect(() => () => clearTimeout(typingTimer.current), []);
  useEffect(() => {
    const timer = setInterval(() => setClientTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshConversations(controller.signal);
    return () => controller.abort();
  }, [refreshConversations]);

  useEffect(() => {
    if (!searchOpen || search.trim().length < 2) {
      setContacts([]);
      setContactsLoading(false);
      setContactsError("");
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setContactsLoading(true);
      setContactsError("");
      try {
        setContacts(await searchDirectoryMembers(search, { signal: controller.signal }));
      } catch (error) {
        if (error.name !== "AbortError") setContactsError(error.message || "Could not search the member directory.");
      } finally {
        if (!controller.signal.aborted) setContactsLoading(false);
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, searchOpen]);

  const selected = conversations.find((item) => item.id === selectedId) || null;

  const openConversation = useCallback(async (conversation) => {
    selectedIdRef.current = conversation.id;
    setSelectedId(conversation.id);
    setMessages([]);
    setMessageQuery("");
    setActiveMessageQuery("");
    setHasOlder(false);
    setThreadError("");
    setPartnerTyping(false);
    setPresenceKnown(false);
    setPartnerOnline(false);
    clearTimeout(typingTimer.current);
    setThreadLoading(true);
    try {
      const page = await listMessages(conversation.id);
      setMessages(page.messages);
      setHasOlder(page.nextBeforeSequence > 0);
      const latest = page.messages.at(-1);
      if (latest) {
        await markConversationRead(conversation.id, latest.id);
        setConversations((current) => current.map((item) => item.id === conversation.id
          ? { ...item, unreadCount: 0, myLastReadSequence: Math.max(item.myLastReadSequence || 0, latest.sequence) }
          : item));
      }
    } catch (error) {
      if (error.name !== "AbortError") setThreadError(error.message || "Could not load messages.");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  async function startConversation(member) {
    setContactsError("");
    try {
      const conversation = await createConversation(member.id);
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSearchOpen(false);
      setSearch("");
      await openConversation(conversation);
    } catch (error) {
      setContactsError(error.message || "Could not start the conversation.");
    }
  }

  async function submitMessage({ body, attachmentIds }) {
    if (!selected || !body.trim() || sending) return false;
    const idempotencyKey = JSON.stringify([body.trim(), attachmentIds]);
    const clientMessageId = pendingClientIDs.current.get(idempotencyKey) || crypto.randomUUID();
    pendingClientIDs.current.set(idempotencyKey, clientMessageId);
    setSending(true);
    realtime.send({ type: "typing.stop", scope: "direct", conversationId: selected.id });
    setPartnerTyping(false);
    setThreadError("");
    try {
      const message = await sendMessage(selected.id, body, clientMessageId, attachmentIds);
      pendingClientIDs.current.delete(idempotencyKey);
      setMessages((current) => current.some((item) => item.id === message.id)
        ? current
        : [...current, message].sort((a, b) => a.sequence - b.sequence));
      setConversations((current) => current.map((item) => item.id === selected.id
        ? { ...item, lastMessage: message, unreadCount: 0 }
        : item));
      return true;
    } catch (error) {
      setThreadError(error.message || "Message could not be sent. Retry when you are back online.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function saveMessageEdit(message) {
    if (!selected || !editBody.trim()) return;
    try {
      const updated = await editMessage(selected.id, message.id, editBody);
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, lastMessage: item.lastMessage?.id === updated.id ? updated : item.lastMessage } : item));
      setEditingMessageId("");
      setEditBody("");
      setThreadError("");
    } catch (error) {
      setThreadError(error.message || "Could not edit this message.");
    }
  }

  async function removeOwnMessage(message) {
    if (!selected || !window.confirm("Delete this message for everyone in the conversation?")) return;
    try {
      await deleteMessage(selected.id, message.id);
      const removed = { ...message, body: "", attachments: [], attachmentCount: 0, deleted: true };
      setMessages((current) => current.map((item) => item.id === message.id ? removed : item));
      setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, lastMessage: item.lastMessage?.id === message.id ? removed : item.lastMessage } : item));
      setEditingMessageId("");
      setThreadError("");
    } catch (error) {
      setThreadError(error.message || "Could not delete this message.");
    }
  }

  async function loadOlderMessages() {
    if (!selected?.id || !messages.length || threadLoading) return;
    const beforeSequence = messages[0].sequence;
    setThreadLoading(true);
    setThreadError("");
    try {
      const page = await listMessages(selected.id, { beforeSequence, query: activeMessageQuery });
      setMessages((current) => [...page.messages, ...current]);
      setHasOlder(page.nextBeforeSequence > 0);
    } catch (error) {
      setThreadError(error.message || "Could not load older messages.");
    } finally {
      setThreadLoading(false);
    }
  }

  async function searchCurrentConversation(event) {
    event.preventDefault();
    const query = messageQuery.trim();
    if (!selected || query.length < 2 || threadLoading) return;
    setThreadLoading(true);
    setThreadError("");
    try {
      const page = await listMessages(selected.id, { query });
      setMessages(page.messages);
      setHasOlder(page.nextBeforeSequence > 0);
      setActiveMessageQuery(query);
    } catch (error) {
      setThreadError(error.message || "Could not search this conversation.");
    } finally {
      setThreadLoading(false);
    }
  }

  return (
    <div className="messages-workspace">
      <div className="messages-view-tabs" role="group" aria-label="Message type">
        <button type="button" className={view === "direct" ? "active" : ""} aria-pressed={view === "direct"} onClick={() => setView("direct")}>Direct messages</button>
        <button type="button" className={view === "groups" ? "active" : ""} aria-pressed={view === "groups"} onClick={() => setView("groups")}>Group chats</button>
      </div>
      {view === "direct" ? <section className={`screen active messages-screen${selected ? " has-selection" : ""}`} aria-label="Messages">
      <aside className="messages-list-panel" aria-label="Conversations">
        <div className="messages-title-row">
          <div><p className="group-eyebrow">CITY4CHRIST COMMUNITY</p><h1>Messages</h1><RealtimeStatus status={realtime.status} /></div>
          <button className="btn dark" type="button" onClick={() => { setSearchOpen((open) => !open); setSearch(""); }} aria-label="New conversation">New</button>
        </div>
        {searchOpen && <div className="message-member-search">
          <label htmlFor="message-member-search">Search members</label>
          <input id="message-member-search" type="search" role="searchbox" aria-label="Search members" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the member directory" />
          {contactsLoading && <p role="status">Searching members…</p>}
          {contactsError && <p className="messages-error" role="alert">{contactsError}</p>}
          {!contactsLoading && search.trim().length >= 2 && !contactsError && contacts.length === 0 && <p className="messages-muted">No directory-visible members found.</p>}
          <ul className="message-contact-list">{contacts.map((member) => <li key={member.id}><button type="button" className="message-contact" onClick={() => void startConversation(member)}><Avatar name={nameOf(member)} src={member.avatar?.url} size={38} /><span>Message {nameOf(member)}</span></button></li>)}</ul>
        </div>}
        {conversationError && <div className="messages-error" role="alert"><span>{conversationError}</span><button className="btn soft" type="button" onClick={() => void refreshConversations()}>Try again</button></div>}
        {loading ? <p className="messages-state" role="status">Loading conversations…</p> : !conversationError && conversations.length === 0 && !searchOpen ? <p className="messages-empty">No conversations yet. Start one with a church member.</p> : null}
        <ul className="conversation-list">
          {conversations.map((conversation) => {
            const partnerName = nameOf(conversation);
            const preview = conversation.lastMessage?.deleted ? "Message deleted" : conversation.lastMessage?.body || (conversation.lastMessage?.attachmentCount ? "Attachment" : "Start a conversation");
            return <li key={conversation.id}><button type="button" className={`conversation-row${conversation.id === selectedId ? " active" : ""}`} aria-label={`Open conversation with ${partnerName}`} aria-pressed={conversation.id === selectedId} onClick={() => void openConversation(conversation)}>
              <Avatar name={partnerName} size={44} /><span className="conversation-row-main"><span className="conversation-row-top"><strong>{partnerName}</strong><time>{timeLabel(conversation.lastMessage?.createdAt)}</time></span><span className="conversation-row-preview">{preview}</span></span>{conversation.unreadCount > 0 && <span className="conversation-unread" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
            </button></li>;
          })}
        </ul>
      </aside>
      <section className="message-thread" aria-label="Conversation">
        {!selected ? <div className="message-thread-placeholder"><p>Choose a conversation or start a new one.</p></div> : <>
          <header className="message-thread-header">
            <button type="button" className="messages-back" onClick={() => { selectedIdRef.current = ""; setSelectedId(""); }} aria-label="Back to conversations">Back</button>
            <Avatar name={nameOf(selected)} size={40} />
            <div><h2>{nameOf(selected)}</h2><p>{presenceKnown ? partnerOnline ? "Online" : "Not online" : "Private direct conversation"}</p></div>
          </header>
          <form className="message-search-form" onSubmit={searchCurrentConversation} role="search" aria-label="Search this conversation">
            <label className="sr-only" htmlFor="direct-message-search">Search messages</label>
            <input id="direct-message-search" type="search" aria-label="Search messages" minLength={2} maxLength={120} value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search messages" />
            <button className="btn soft" type="submit" disabled={threadLoading || messageQuery.trim().length < 2}>Search</button>
            {activeMessageQuery && <button className="btn soft" type="button" onClick={() => { setMessageQuery(""); setActiveMessageQuery(""); void openConversation(selected); }}>Clear</button>}
          </form>
          {activeMessageQuery && <p className="messages-muted">Search results for “{activeMessageQuery}”</p>}
          {threadError && <div className="messages-error thread-error" role="alert"><span>{threadError}</span><button className="btn soft" type="button" onClick={() => void openConversation(selected)}>Try again</button></div>}
          {threadLoading && <p role="status" className="messages-state">Loading messages…</p>}
          <div className="message-history" aria-live="polite">
            {messages.length === 0 && !threadLoading && <p className="messages-empty thread-empty">Start the conversation with a message.</p>}
            {messages.map((message) => <article key={message.id} className={`message-bubble${message.senderId !== profile?.id ? " received" : " sent"}${message.deleted ? " removed" : ""}`}>
              {message.deleted ? <p>This message was deleted.</p> : editingMessageId === message.id ? <form className="message-edit-form" onSubmit={(event) => { event.preventDefault(); void saveMessageEdit(message); }}>
                <label className="sr-only" htmlFor={`edit-${message.id}`}>Edit message</label>
                <textarea id={`edit-${message.id}`} aria-label="Edit message" rows={3} maxLength={4000} value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                <button className="btn dark" type="submit" disabled={!editBody.trim()}>Save edit</button>
                <button className="btn soft" type="button" onClick={() => { setEditingMessageId(""); setEditBody(""); }}>Cancel</button>
              </form> : <>{message.body && <p>{message.body}</p>}<MessageAttachments items={message.attachments} />{message.editedAt && <span className="message-edited-label">Edited</span>}</>}
              <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
              {message.senderId === profile?.id && !message.deleted && clientTime - new Date(message.createdAt).getTime() >= 0 && clientTime - new Date(message.createdAt).getTime() < 10 * 60 * 1000 && editingMessageId !== message.id && <div className="message-own-actions">
                <button type="button" className="btn soft" aria-label="Edit message" onClick={() => { setEditingMessageId(message.id); setEditBody(message.body); }}>Edit</button>
                <button type="button" className="btn soft" aria-label="Delete message" onClick={() => void removeOwnMessage(message)}>Delete</button>
              </div>}
              {message.senderId === profile?.id && message.sequence <= selected.partnerReadSequence && <span className="message-read-receipt">Seen</span>}
            </article>)}
          </div>
          {partnerTyping && <p className="message-typing-indicator" role="status">{nameOf(selected)} is typing…</p>}
          {hasOlder && <button className="btn soft older-messages" type="button" onClick={() => void loadOlderMessages()} disabled={threadLoading}>Load older messages</button>}
          <MessageComposer key={selected.id} label="Send a message" placeholder="Write a message…" disabled={sending} onSend={submitMessage} onTyping={(active) => realtime.send({ type: active ? "typing.start" : "typing.stop", scope: "direct", conversationId: selected.id })} />
        </>}
      </section>
      </section> : <GroupMessagesPanel />}
    </div>
  );
}
