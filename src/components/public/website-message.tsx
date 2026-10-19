"use client";
import {useEffect, useRef, useState} from "react";
import {api} from "@/lib/api-client";
import "./website-message.css";

type Message = {id: string; sender: string; text: string; createdAt: string};
type Conversation = {name: string; blocked?: boolean; messages: Message[]};
export default function WebsiteMessage({open, onClose}: {open: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameDialog = useRef<HTMLDialogElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const latestMessage = conversation?.messages.at(-1)?.id;
  useEffect(() => {
    if (!open || !thread.current) return;
    thread.current.scrollTo({top: thread.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }, [open, latestMessage]);
  useEffect(() => {
    if (!open) {nameDialog.current?.close(); dialog.current?.close(); return;}
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    let stopped = false;
    let firstRefresh = true;
    async function refresh() {
      try {
        const result = await api<{conversation: Conversation | null}>("/api/messages");
        if (!stopped) {
          setConversation(result.conversation); setName(current => current || result.conversation?.name || ""); setError("");
          setInitialized(true);
          if (firstRefresh) {
            firstRefresh = false;
            requestAnimationFrame(() => {if (!stopped) dialog.current?.querySelector<HTMLElement>(result.conversation ? "textarea" : "input")?.focus();});
          }
        }
      } catch (error) {if (!stopped) setError(error instanceof Error ? error.message : "Unable to load messages.");}
      finally {if (!stopped) setLoading(false);}
    }
    void refresh();
    const timer = setInterval(() => {if (!document.hidden) void refresh();}, 8000);
    return () => {stopped = true; clearInterval(timer);};
  }, [open]);
  useEffect(() => {
    if (open && initialized && !conversation) {
      nameDialog.current?.showModal();
      nameDialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    } else {
      const wasOpen = nameDialog.current?.open;
      nameDialog.current?.close();
      if (wasOpen && open) dialog.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
  }, [open, initialized, conversation]);
  return <><dialog ref={dialog} className="website-message-dialog" aria-labelledby="website-message-title" onCancel={onClose} onClose={() => {if (!dialog.current?.open) onClose();}} onClick={event => {if (event.target === event.currentTarget) {const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();}}}>
    <div className="website-message-heading"><span className="website-message-avatar" aria-hidden="true">F</span><div><h2 id="website-message-title">Falak Rides</h2><p>Messages with our team</p></div><button type="button" className="website-message-close app-x-button" aria-label="Close messages" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
    <div ref={thread} className="website-message-thread" role="log" aria-label="Conversation with Falak Rides">
      {!conversation?.messages.length && <div className="website-message-welcome"><span aria-hidden="true">✦</span><h3>Let’s talk travel</h3><p>Have a question? Leave a message<br/>and our team will reply here.</p></div>}
      {conversation?.messages.map(item => <div key={item.id} className="website-message-bubble" data-sender={item.sender}><span className="website-message-sr-only">{item.sender === "admin" ? "Falak Rides" : "You"}</span><p>{item.text}</p><time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{new Date(item.createdAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</time></div>)}
      {loading && <p className="website-message-loading" role="status">Loading messages…</p>}
    </div>
    <form className="website-message-form" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError(""); setStatus("");
      try {const result = await api<{conversation: Conversation}>("/api/messages", {method: "POST", body: JSON.stringify({...(!conversation ? {name} : {}), message})}); setConversation(result.conversation); setMessage(""); setStatus("Message sent. You can check our reply here.");}
      catch (error) {setError(error instanceof Error ? error.message : "Your message could not be sent.");}
      finally {setBusy(false);}
    }}>
      <div className="website-message-composer"><label className="website-message-sr-only" htmlFor="website-message-text">Message</label><textarea onKeyDown={event => {if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {event.preventDefault(); if (!event.repeat && !busy && !loading && !conversation?.blocked && message.trim()) event.currentTarget.form?.requestSubmit();}}} id="website-message-text" name="message" value={message} onChange={event => setMessage(event.target.value)} required maxLength={1500} rows={2} placeholder={conversation?.blocked ? "Messaging unavailable" : "Write a message…"} disabled={conversation?.blocked}/><button className="website-message-send" type="submit" aria-label={busy ? "Sending message" : "Send message"} disabled={busy || loading || conversation?.blocked}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z M11 13 22 2"/></svg></button></div>
      {error && <p className="website-message-error" role="alert">{error}</p>}
      <p className="website-message-sr-only" role="status">{status}</p>
      <small>{conversation?.blocked ? "Messaging is unavailable for this conversation." : "Come back here anytime to see replies."}</small>
    </form>
  </dialog><dialog ref={nameDialog} className="website-name-dialog" aria-labelledby="website-name-title" aria-describedby="website-name-description" onCancel={onClose}>
    <button type="button" className="app-x-button app-dialog-x" aria-label="Close name popup" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    {!conversation && <form onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setNameError("");
      try {const result = await api<{conversation: Conversation}>("/api/messages", {method: "PATCH", body: JSON.stringify({name})}); setConversation(result.conversation); setName(result.conversation.name);}
      catch (error) {setNameError(error instanceof Error ? error.message : "Unable to save your name.");}
      finally {setBusy(false);}
    }}><span className="website-name-avatar" aria-hidden="true">F</span><h2 id="website-name-title">Before we start</h2><p id="website-name-description">What should we call you?</p><label htmlFor="website-message-name">Your name</label><input id="website-message-name" name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} autoComplete="name" placeholder="Enter your name"/>{nameError && <p className="website-message-error" role="alert">{nameError}</p>}<button type="submit" className="website-name-continue" disabled={busy}>{busy ? "Saving…" : "Start chatting"}</button><button type="button" className="website-name-cancel" onClick={onClose}>Maybe later</button></form>}
  </dialog></>;
}
