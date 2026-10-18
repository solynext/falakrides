"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import ContentWorkspace from "./content-workspace";
import {changedFields} from "@/features/content/editor-utils";
import type {ContentDocument, ContentValues} from "@/features/content/types";

export default function WebsiteContent({actionsTarget}: {actionsTarget: HTMLDivElement | null}) {
  const [document, setDocument] = useState<ContentDocument | null>(null);
  const [values, setValues] = useState<ContentValues>({});
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const dirty = !!document && changedFields(values, document.draft).length > 0;
  const confirmDiscard = useUnsavedChanges(dirty, () => {if (document) setValues(document.draft);});
  const busy = ["loading", "saving", "publishing"].includes(state);
  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const response = await fetch("/api/content?admin=1", {cache: "no-store"});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load website content.");
      setDocument(result); setValues(result.draft); setState("ready");
    } catch (error) {setError(error instanceof Error ? error.message : "Unable to connect. Check your connection and try again."); setState("unavailable");}
  }, []);
  useEffect(() => {const timer = setTimeout(() => {void load();}, 0); return () => clearTimeout(timer);}, [load]);
  async function save(publish: boolean) {
    if (!document || pending.current) return;
    pending.current = true;
    setState(publish ? "publishing" : "saving"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/content", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: publish ? "publish" : "save", version: document.version, values})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save.");
      setDocument(result); setValues(result.draft); setNotice(publish ? "Published. Open website pages update within 5 seconds." : "Draft saved. The live website is unchanged.");
    } catch (error) {setError(error instanceof Error ? error.message : "Unable to save.");}
    finally {pending.current = false; setState("ready");}
  }
  return <section className="adm-cms" aria-label="Website content editor" aria-busy={busy}>
    {error && <div className="adm-cms-error" role="alert">{error}{document && <button onClick={() => confirmDiscard(() => {void load();})}>Reload latest draft</button>}</div>}
    {notice && <p className="adm-cms-success" role="status">{notice}</p>}
    {!document ? state === "loading" ? <p role="status">Loading website content...</p> : <div className="adm-cms-login"><h2>Unable to load website content</h2><button className="adm-button secondary" onClick={load}>Try again</button></div> : <ContentWorkspace actionsTarget={actionsTarget} document={document} values={values} onChange={setValues} onSave={save} state={state}/>}
  </section>;
}
