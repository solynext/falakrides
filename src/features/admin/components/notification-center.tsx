"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";

import {useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import type {AdminRow} from "../types";
import {api} from "@/lib/api-client";

type Notice = {id: string; title: string; message: string; label: string; module: string; record: AdminRow};
export default function NotificationCenter({bookings, notifications, onOpen, initialState}: {
  bookings: AdminRow[]; notifications: AdminRow[];
  initialState: {noticeId: string; read: boolean; dismissed: boolean}[];
  onOpen: (module: string, record: AdminRow) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>(initialState.filter(item => item.read).map(item => item.noticeId));
  const [dismissed, setDismissed] = useState<string[]>(initialState.filter(item => item.dismissed).map(item => item.noticeId));
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const notices: Notice[] = [
    ...bookings.filter(row => row.status === "Pending").map(record => ({id: `booking-${record.id}`, title: "Booking needs review", message: `${record.customer} \u00b7 ${record.route || record.id}`, label: "Review booking", module: "bookings", record})),
    ...notifications.map(record => ({id: `message-${record.id}`, title: record.status === "Draft" ? "Message draft ready" : "Message queued in preview", message: `${record.recipient} \u00b7 ${record.channel}`, label: "Review message", module: "notifications", record})),
  ].filter(notice => !dismissed.includes(notice.id));
  const unread = notices.filter(notice => !read.includes(notice.id)).length;
  const visible = notices.filter(notice => filter === "all" || !read.includes(notice.id));
  function close() { dialog.current?.close(); }
  async function persist(ids: string[], action: "read" | "dismiss") {try {await api("/api/admin/notices", {method: "PATCH", body: JSON.stringify({ids, action})}); setRead(current => Array.from(new Set([...current, ...ids]))); if (action === "dismiss") setDismissed(current => Array.from(new Set([...current, ...ids]))); setError("");} catch (error) {setError(error instanceof Error ? error.message : "Unable to update notifications.");}}
  function markRead(id: string) {void persist([id], "read");}
  return <>
    <button ref={trigger} className="adm-icon-button adm-notification-trigger" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="admin-notification-center" onClick={() => {dialog.current?.showModal(); setOpen(true);}}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      {unread > 0 && <span className="adm-notification-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
    </button>
    <dialog ref={dialog} id="admin-notification-center" className="adm-notifications" aria-labelledby="admin-notifications-title" onClose={() => {setOpen(false); trigger.current?.focus();}} onClick={event => {if (isDialogBackdropClick(event)) close();}}>
      <div className="adm-notifications-head"><h2 id="admin-notifications-title">Notifications <span>{unread}</span></h2><button className="adm-icon-button app-x-button" aria-label="Close notifications" onClick={close} autoFocus><CloseIcon/></button></div>
      <div className="adm-notifications-tools"><div role="group" aria-label="Notification filter"><button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button><button aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread ({unread})</button></div><button disabled={!unread} onClick={() => {void persist(notices.map(notice => notice.id), "read");}}>Mark all read</button></div>
      <div className="adm-notifications-list">{visible.length ? visible.map(notice => <article key={notice.id} className={`adm-notice ${read.includes(notice.id) ? "is-read" : ""}`}>
        <button className="adm-notice-open" aria-label={`${notice.label}: ${notice.record.id}${read.includes(notice.id) ? "" : ", unread"}`} onClick={() => {markRead(notice.id); dialog.current?.close(); onOpen(notice.module, notice.record);}}>
          <span className="adm-notice-icon"><Icon name={notice.module === "bookings" ? "car" : "bag"} size={18}/></span>
          <span className="adm-notice-content"><span className="adm-notice-title">{notice.title}{!read.includes(notice.id) && <i aria-hidden="true"/>}</span><span className="adm-notice-message">{notice.message}</span><small>{notice.record.id}</small></span>
        </button>
        <button className="adm-notice-dismiss app-x-button" aria-label={`Dismiss ${notice.title}: ${notice.record.id}`} onClick={() => {void persist([notice.id], "dismiss");}}><CloseIcon/></button>
      </article>) : <div className="adm-notifications-empty"><Icon name="check" size={24}/><h3>All caught up</h3><p>{filter === "unread" ? "No unread notifications." : "New activity will appear here."}</p></div>}</div>
      <p className="adm-notifications-note" role={error ? "alert" : undefined}>{error || "Recent activity"}</p>
    </dialog>
  </>;
}

function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>;
}
