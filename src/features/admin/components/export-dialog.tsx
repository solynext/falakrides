"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";

import {useEffect, useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import {createExport, downloadExport, type ExportData, type ExportFormat} from "../exports";
import "./export-dialog.css";

const formats = [{id: "csv", title: "CSV", description: "Spreadsheets & data analysis", hint: "Excel, Google Sheets", color: "green"}, {id: "pdf", title: "PDF", description: "A polished, ready-to-share report", hint: "Printing & sharing", color: "rose"}, {id: "html", title: "HTML", description: "A report you can open in any browser", hint: "Browser-friendly", color: "blue"}] as const;

export default function ExportDialog({data, onClose}: {data: ExportData; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(["csv"]);
  const formatLabel = selectedFormats.map(value => value.toUpperCase()).join(", ");
  function toggleFormat(value: ExportFormat) {
    setSelectedFormats(current => formats.filter(option => option.id === value ? !current.includes(value) : current.includes(option.id)).map(option => option.id));
  }
  const [phase, setPhase] = useState<"select" | "processing" | "done" | "error">("select");
  const [progress, setProgress] = useState(1);
  const [error, setError] = useState("");
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const [files, setFiles] = useState<{blob: Blob; filename: string; format: ExportFormat}[]>([]);
  const focusTarget = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    alive.current = true;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {alive.current = false; if (interval.current) clearInterval(interval.current); if (timeout.current) clearTimeout(timeout.current); element?.close(); document.body.style.overflow = overflow; previous?.focus();};
  }, []);
  function focusHeading() {requestAnimationFrame(() => focusTarget.current?.focus({preventScroll: true}));}
  async function proceed() {
    if (busy.current || !selectedFormats.length) return;
    busy.current = true; setFiles([]); setError(""); setProgress(1); setPhase("processing"); focusHeading();
    const duration = 5000 + Math.random() * 2000;
    const start = performance.now();
    interval.current = setInterval(() => {
      const ratio = Math.min(1, (performance.now() - start) / duration);
      const next = Math.min(98, Math.floor(1 + 97 * (1 - Math.pow(1 - ratio, 1.5))));
      setProgress(current => Math.max(current, next));
    }, 80);
    try {
      const result: typeof files = [];
      for (const format of selectedFormats) {
        if (!alive.current) return;
        const blob = await createExport(data, format);
        result.push({blob, filename: `falak-${data.name}.${format}`, format});
      }
      if (!alive.current) return;
      timeout.current = setTimeout(() => {
        if (!alive.current) return;
        if (interval.current) clearInterval(interval.current);
        setFiles(result); setProgress(100); setPhase("done"); busy.current = false;
        result.forEach(item => downloadExport(item.blob, item.filename)); focusHeading();
      }, Math.max(0, duration - (performance.now() - start)));
    } catch (reason) {
      if (!alive.current) return;
      if (interval.current) clearInterval(interval.current);
      busy.current = false; setError(reason instanceof Error ? reason.message : "The export could not be prepared. Please try again."); setPhase("error"); focusHeading();
    }
  }
  const stage = progress < 30 ? "Gathering your records" : progress < 65 ? "Organizing the details" : progress < 90 ? "Putting your report together" : "Adding the finishing touches";

  return <dialog ref={dialog} className="adm-export-dialog" aria-labelledby="export-title" onCancel={onClose} onClick={event => {if (isDialogBackdropClick(event)) onClose();}}>
    <div className="adm-export-top"><span><i/> FALAK RIDES WORKSPACE</span><button className="app-x-button" type="button" aria-label={phase === "processing" ? "Cancel export and close" : "Close export"} onClick={onClose}>×</button></div>
    {phase === "select" ? <>
      <h2 id="export-title" className="adm-sr-only" ref={focusTarget} tabIndex={-1}>Export report</h2>
      <div className="adm-export-context"><span><Icon name="car" size={17}/>{data.title}</span><strong>{data.rows.length} {data.rows.length === 1 ? "record" : "records"}</strong><small>Current selection · saved records</small></div>
      <fieldset className="adm-export-formats"><legend>Choose file formats</legend><label className="adm-export-format adm-export-select-all" data-selected={selectedFormats.length === formats.length}><input type="checkbox" checked={selectedFormats.length === formats.length} onChange={event => setSelectedFormats(event.target.checked ? formats.map(option => option.id) : [])}/><span className="adm-export-format-copy"><strong>Select all</strong></span><span className="adm-export-checkbox" aria-hidden="true">{selectedFormats.length === formats.length && <Icon name="check" size={13}/>}</span></label>{formats.map(option => <label className={`adm-export-format ${option.color}`} key={option.id} data-selected={selectedFormats.includes(option.id)}><input type="checkbox" name="export-format" value={option.id} checked={selectedFormats.includes(option.id)} onChange={() => toggleFormat(option.id)}/><span className="adm-export-format-copy"><strong>{option.title}</strong></span><span className="adm-export-checkbox" aria-hidden="true">{selectedFormats.includes(option.id) && <Icon name="check" size={13}/>}</span></label>)}</fieldset>
      <div className="adm-export-footer"><span><Icon name="shield" size={15}/> Your current filters are included</span><button type="button" className="adm-export-primary" disabled={!selectedFormats.length} onClick={proceed}>{selectedFormats.length ? `Export ${formatLabel}` : "Select a format"}<Icon size={17}/></button></div>
    </> : phase === "processing" ? <div className="adm-export-processing">
      <div className="adm-export-orbit"><svg viewBox="0 0 160 160" aria-hidden="true"><circle className="adm-export-track" cx="80" cy="80" r="70"/><circle className="adm-export-ring" cx="80" cy="80" r="70" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress}/></svg><span><strong>{progress}<small>%</small></strong><span>PREPARING</span></span><i/></div>
      <span className="adm-export-eyebrow">A FEW MOMENTS, ALL SORTED</span><h2 id="export-title" ref={focusTarget} tabIndex={-1}>Making it ready for you.</h2><p role="status" aria-live="polite">{stage}<span className="adm-export-dots" aria-hidden="true">…</span></p>
      <div className="adm-export-progress" role="progressbar" aria-label="Preparing export" aria-valuemin={1} aria-valuemax={100} aria-valuenow={progress}><span style={{width: `${progress}%`}}/></div>
      <ol className="adm-export-stages">{["Collect", "Format", "Finish"].map((label, index) => <li key={label} data-complete={progress >= [30, 65, 99][index]} data-active={progress >= [1, 30, 65][index]}><span>{progress >= [30, 65, 99][index] ? "✓" : index + 1}</span>{label}</li>)}</ol>
      {selectedFormats.map(format => <div className="adm-export-processing-file" key={format}><span className={`adm-export-file ${format}`}><FileIcon/><b>{format.toUpperCase()}</b></span><span><strong>{`falak-${data.name}.${format}`}</strong><small>{data.rows.length} records ? {data.title}</small></span><span className="adm-export-file-pulse"/></div>)}
      <p className="adm-export-time"><Icon name="clock" size={14}/> Usually ready in 5–7 seconds</p><button type="button" className="adm-export-cancel" onClick={onClose}>Cancel export</button>
    </div> : phase === "done" ? <div className="adm-export-result"><span className="adm-export-success"><Icon name="check" size={32}/></span><span className="adm-export-eyebrow">100% · READY TO GO</span><h2 id="export-title" ref={focusTarget} tabIndex={-1}>Your report is ready.</h2><p>Your {formatLabel} {selectedFormats.length === 1 ? "download has" : "downloads have"} started.<br/>Your report is available in each selected format.</p>{files.map(item => <div className="adm-export-result-file" key={item.format}><strong>{item.filename}</strong><span>{data.rows.length} records ? {item.format.toUpperCase()} document</span><button type="button" className="adm-export-primary" onClick={() => downloadExport(item.blob, item.filename)}><ExportIcon/>Download {item.format.toUpperCase()}</button></div>)}<button type="button" className="adm-export-cancel" onClick={onClose}>Done</button></div> : <div className="adm-export-result"><span className="adm-export-success error">!</span><h2 id="export-title" ref={focusTarget} tabIndex={-1}>Let’s try that again.</h2><p role="alert">{error}</p><button type="button" className="adm-export-primary" onClick={proceed}>Retry export<Icon size={17}/></button><button type="button" className="adm-export-cancel" onClick={() => setPhase("select")}>Choose another format</button></div>}
  </dialog>;
}
function ExportIcon() {return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></svg>;}
function FileIcon() {return <svg width="32" height="36" viewBox="0 0 32 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><path d="M7 2h12l7 7v24H7V2Z"/><path d="M19 2v8h7M11 15h11m-11 4h11"/></svg>;}
