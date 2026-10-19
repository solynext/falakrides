"use client";

import {createContext, useCallback, useContext, useEffect, useId, useRef, useState} from "react";
import "./unsaved-changes.css";

type Entry = {discard: () => void};
type Guard = {register: (id: string, entry: Entry | null) => void; confirm: (action: () => void, id?: string) => void};
const Context = createContext<Guard | null>(null);

export function UnsavedChangesProvider({children}: {children: React.ReactNode}) {
  const entries = useRef(new Map<string, Entry>());
  const pending = useRef<{action: () => void; ids: string[]} | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const register = useCallback((id: string, entry: Entry | null) => {if (entry) entries.current.set(id, entry); else entries.current.delete(id);}, []);
  const confirm = useCallback((action: () => void, id?: string) => {
    const ids = id ? entries.current.has(id) ? [id] : [] : [...entries.current.keys()];
    if (!ids.length) {action(); return;}
    if (pending.current) return;
    previousFocus.current = document.activeElement as HTMLElement;
    pending.current = {action, ids};
    setVisible(true);
  }, []);
  const keep = useCallback(() => {pending.current = null; setVisible(false); previousFocus.current?.focus();}, []);
  function discard() {
    const request = pending.current;
    pending.current = null;
    setVisible(false);
    if (!request) return;
    for (const id of request.ids) {const entry = entries.current.get(id); entries.current.delete(id); entry?.discard();}
    // Close the top-layer confirmation before opening another native dialog.
    dialog.current?.close();
    request.action();
  }
  useEffect(() => {if (visible) dialog.current?.showModal(); else dialog.current?.close();}, [visible]);
  useEffect(() => {
    let replay = false;
    function click(event: MouseEvent) {
      if (replay || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || !entries.current.size) return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return;
      if (!["http:", "https:"].includes(url.protocol)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      confirm(() => {replay = true; try {link.click();} finally {replay = false;}});
    }
    function unload(event: BeforeUnloadEvent) {if (entries.current.size) {event.preventDefault(); event.returnValue = "";}}
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    return () => {document.removeEventListener("click", click, true); window.removeEventListener("beforeunload", unload);};
  }, [confirm]);
  // Index same-document history entries so a cancelled Back/Forward keeps the editor mounted.
  useEffect(() => {
    const key = "__falakEditIndex";
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    let index = Number(history.state?.[key] ?? 0);
    let restoring = false;
    let approved = false;
    originalReplace.call(history, {...history.state, [key]: index}, "");
    const push: History["pushState"] = function(data, unused, url) {index++; originalPush.call(history, {...data, [key]: index}, unused, url);};
    const replace: History["replaceState"] = function(data, unused, url) {originalReplace.call(history, {...data, [key]: index}, unused, url);};
    history.pushState = push; history.replaceState = replace;
    function pop(event: PopStateEvent) {
      const next = event.state?.[key];
      if (typeof next !== "number") return; // Cross-document history uses beforeunload.
      if (restoring) {restoring = false; event.stopImmediatePropagation(); return;}
      if (approved || !entries.current.size) {approved = false; index = next; return;}
      const delta = next - index;
      if (!delta) return;
      event.stopImmediatePropagation(); restoring = true; history.go(-delta);
      confirm(() => {approved = true; history.go(delta);});
    }
    window.addEventListener("popstate", pop, true);
    return () => {window.removeEventListener("popstate", pop, true); if (history.pushState === push) history.pushState = originalPush; if (history.replaceState === replace) history.replaceState = originalReplace;};
  }, [confirm]);
  return <Context.Provider value={{register, confirm}}>{children}<dialog ref={dialog} className="unsaved-dialog" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onCancel={event => {event.preventDefault(); keep();}}>
    <button type="button" className="app-x-button app-dialog-x" aria-label="Close unsaved changes popup" onClick={keep}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    <div className="unsaved-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg></div>
    <h2 id="unsaved-title">You have unsaved changes</h2><p id="unsaved-description">Keep editing to save your work, or discard your changes and continue.</p>
    <div className="unsaved-actions"><button type="button" className="unsaved-discard" onClick={discard}>Discard changes</button><button type="button" className="unsaved-keep" autoFocus onClick={keep}>Keep editing</button></div>
  </dialog></Context.Provider>;
}

export function useUnsavedChanges(dirty: boolean, onDiscard: () => void) {
  const context = useContext(Context);
  if (!context) throw new Error("UnsavedChangesProvider is required");
  const {register, confirm} = context;
  const id = useId();
  const discard = useRef(onDiscard);
  useEffect(() => {discard.current = onDiscard;});
  useEffect(() => {register(id, dirty ? {discard: () => discard.current()} : null); return () => register(id, null);}, [dirty, id, register]);
  return useCallback((action: () => void) => confirm(action, id), [confirm, id]);
}

export function useConfirmNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error("UnsavedChangesProvider is required");
  return context.confirm;
}
