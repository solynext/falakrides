"use client";

import {useEffect, useRef, useState} from "react";
import {api} from "@/lib/api-client";
import {CUSTOMER_FILE_LIMIT, parseCustomerCsv, type ImportedCustomer} from "../customer-import";
import {isDialogBackdropClick} from "@/lib/dialog-events";
import "./customer-import.css";

export default function CustomerImport({onClose, onImported}: {onClose: () => void; onImported: (message: string) => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ImportedCustomer[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [filename, setFilename] = useState("");
  const [source, setSource] = useState<"file" | "link">("file");
  const [link, setLink] = useState("");
  useEffect(() => {const element = dialog.current; element?.showModal(); return () => element?.close();}, []);
  async function selectFile(file?: File) {
    setCsv(""); setRows([]); setError(""); setFilename("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > CUSTOMER_FILE_LIMIT) {setError("Choose a CSV file up to 1 MB. In Google Sheets, use File → Download → Comma-separated values (.csv)."); return;}
    setReading(true);
    try {const text = await file.text(); const parsed = parseCustomerCsv(text); setCsv(text); setRows(parsed); setFilename(file.name);} catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to read this file.");} finally {setReading(false);}
  }
  async function importCustomers() {
    if (busy || reading || (source === "file" ? !rows.length : !link.trim())) return;
    setBusy(true); setError("");
    try {
      const result = await api<{imported: number}>("/api/admin/customers/import", {method: "POST", body: JSON.stringify(source === "link" ? {link: link.trim()} : {csv})});
      onImported(`${result.imported} customers imported.`);
    } catch (reason) {setError(reason instanceof Error ? reason.message : "Import failed. Please try again.");} finally {setBusy(false);}
  }
  return <dialog ref={dialog} className="adm-dialog customer-import" aria-labelledby="customer-import-title" onCancel={event => {event.preventDefault(); if (!busy) onClose();}} onClick={event => {if (!busy && isDialogBackdropClick(event)) onClose();}}>
    <header className="customer-import-header">
      <h2 id="customer-import-title">Import customers</h2>
      <button className="customer-import-close" disabled={busy} onClick={onClose} aria-label="Close import"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </header>
    <form className="customer-import-body" onSubmit={event => {event.preventDefault(); void importCustomers();}}>
      <input ref={fileInput} type="file" accept=".csv,text/csv" hidden disabled={busy || reading} onChange={event => void selectFile(event.target.files?.[0])}/>
      <div className="customer-import-sources">
      <button type="button" className={`customer-import-pick ${source === "file" ? "is-active" : ""}`} aria-pressed={source === "file"} disabled={busy || reading} onClick={() => {setSource("file"); setError(""); fileInput.current?.click();}}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/></svg>
        {reading ? "Reading..." : "Pick file"}
      </button>
      <button type="button" className={`customer-import-pick ${source === "link" ? "is-active" : ""}`} aria-pressed={source === "link"} disabled={busy || reading} onClick={() => {setSource("link"); setError("");}}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>
        Link
      </button>
      </div>
      {source === "link" ? <><div className="customer-import-link-field"><input ref={linkInput} type="url" aria-label="Google Sheets link" placeholder="Paste Google Sheets link" value={link} required disabled={busy} onChange={event => {setLink(event.target.value); setError("");}}/>{link && <button type="button" className="customer-import-clear" aria-label="Clear link" disabled={busy} onClick={() => {setLink(""); setError(""); linkInput.current?.focus();}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>}</div><p className="customer-import-filename">Share as &ldquo;Anyone with the link&rdquo; (Viewer).</p></> : <p className="customer-import-filename" role="status">{filename || "CSV file, up to 1 MB"}</p>}
      {error && <p className="customer-import-error" role="alert">{error}</p>}
      <button type="submit" className="adm-button customer-import-submit" disabled={busy || reading || (source === "file" ? !rows.length : !link.trim())}>{busy ? "Submitting..." : "Submit"}</button>
    </form>
  </dialog>;
}
