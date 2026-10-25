import React, { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/auth/session";
import {
  createConversation,
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
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [sending, setSending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const pendingClientIDs = useRef(new Map());

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
    setSelectedId(conversation.id);
    setMessages([]);
    setHasOlder(false);
    setThreadError("");
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

  async function submitMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body || sending) return;
    const clientMessageId = pendingClientIDs.current.get(body) || crypto.randomUUID();
    pendingClientIDs.current.set(body, clientMessageId);
    setSending(true);
    setThreadError("");
    try {
      const message = await sendMessage(selected.id, body, clientMessageId);
      pendingClientIDs.current.delete(body);
      setMessages((current) => current.some((item) => item.id === message.id)
        ? current
        : [...current, message].sort((a, b) => a.sequence - b.sequence));
      setConversations((current) => current.map((item) => item.id === selected.id
        ? { ...item, lastMessage: message, unreadCount: 0 }
        : item));
      setDraft("");
    } catch (error) {
      setThreadError(error.message || "Message could not be sent. Retry when you are back online.");
    } finally {
      setSending(false);
    }
  }

  async function loadOlderMessages() {
    if (!selected?.id || !messages.length || threadLoading) return;
    const beforeSequence = messages[0].sequence;
    setThreadLoading(true);
    setThreadError("");
    try {
      const page = await listMessages(selected.id, { beforeSequence });
      setMessages((current) => [...page.messages, ...current]);
      setHasOlder(page.nextBeforeSequence > 0);
    } catch (error) {
      setThreadError(error.message || "Could not load older messages.");
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
          <div><p className="group-eyebrow">CITY4CHRIST COMMUNITY</p><h1>Messages</h1></div>
          <button className="btn dark" type="button" onClick={() => { setSearchOpen((open) => !open); setSearch(""); }} aria-label="New conversation">New</button>
        </div>
        {searchOpen && <div className="message-member-search">
          <label htmlFor="message-member-search">Search members</label>
          <input id="message-member-search" type="search" role="searchbox" aria-label="Search members" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the member directory" />
          {contactsLoading && <p role="status">Searching members…</p>}
          {contactsError && <p className="messages-error" role="alert">{contactsError}</p>}
          {!contactsLoading && search.trim().length >= 2 && !contactsError && contacts.length === 0 && <p className="messages-muted">No directory-visible members found.</p>}
          <ul className="message-contact-list">{contacts.map((member) => <li key={member.id}><button type="button" className="message-contact" onClick={() => void startConversation(member)}><Avatar name={nameOf(member)} size={38} /><span>Message {nameOf(member)}</span></button></li>)}</ul>
        </div>}
        {conversationError && <div className="messages-error" role="alert"><span>{conversationError}</span><button className="btn soft" type="button" onClick={() => void refreshConversations()}>Try again</button></div>}
        {loading ? <p className="messages-state" role="status">Loading conversations…</p> : !conversationError && conversations.length === 0 && !searchOpen ? <p className="messages-empty">No conversations yet. Start one with a church member.</p> : null}
        <ul className="conversation-list">
          {conversations.map((conversation) => {
            const partnerName = nameOf(conversation);
            const preview = conversation.lastMessage?.body || "Start a conversation";
            return <li key={conversation.id}><button type="button" className={`conversation-row${conversation.id === selectedId ? " active" : ""}`} aria-label={`Open conversation with ${partnerName}`} aria-pressed={conversation.id === selectedId} onClick={() => void openConversation(conversation)}>
              <Avatar name={partnerName} size={44} /><span className="conversation-row-main"><span className="conversation-row-top"><strong>{partnerName}</strong><time>{timeLabel(conversation.lastMessage?.createdAt)}</time></span><span className="conversation-row-preview">{preview}</span></span>{conversation.unreadCount > 0 && <span className="conversation-unread" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
            </button></li>;
          })}
        </ul>
      </aside>
      <section className="message-thread" aria-label="Conversation">
        {!selected ? <div className="message-thread-placeholder"><p>Choose a conversation or start a new one.</p></div> : <>
          <header className="message-thread-header">
            <button type="button" className="messages-back" onClick={() => setSelectedId("")} aria-label="Back to conversations">Back</button>
            <Avatar name={nameOf(selected)} size={40} />
            <div><h2>{nameOf(selected)}</h2><p>Private direct conversation</p></div>
          </header>
          {threadError && <div className="messages-error thread-error" role="alert"><span>{threadError}</span><button className="btn soft" type="button" onClick={() => void openConversation(selected)}>Try again</button></div>}
          {threadLoading && <p role="status" className="messages-state">Loading messages…</p>}
          <div className="message-history" aria-live="polite">
            {messages.length === 0 && !threadLoading && <p className="messages-empty thread-empty">Start the conversation with a message.</p>}
            {messages.map((message) => <article key={message.id} className={`message-bubble${message.senderId !== profile?.id ? " received" : " sent"}`}>
              <p>{message.body}</p><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
              {message.senderId === profile?.id && message.sequence <= selected.partnerReadSequence && <span className="message-read-receipt">Seen</span>}
            </article>)}
          </div>
          {hasOlder && <button className="btn soft older-messages" type="button" onClick={() => void loadOlderMessages()} disabled={threadLoading}>Load older messages</button>}
          <form className="message-composer" aria-label="Send a message" onSubmit={submitMessage}>
            <label className="sr-only" htmlFor="direct-message-body">Message</label>
            <textarea id="direct-message-body" aria-label="Message" value={draft} maxLength={4000} rows={2} placeholder="Write a message…" onChange={(event) => setDraft(event.target.value)} />
            <button className="btn dark" type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button>
          </form>
        </>}
      </section>
      </section> : <GroupMessagesPanel />}
    </div>
  );
}
