"use client";

import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {isDialogBackdropClick} from "@/lib/dialog-events";

import BrandLogo from "@/components/ui/brand-logo";
import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {adminSectionFromPath, adminSectionPath} from "../routes";
import NotificationCenter from "./notification-center";
import AdminProfile from "./admin-profile";
import PasswordSettings from "./password-settings";
import ExportDialog from "./export-dialog";
import CustomerImport from "./customer-import";
import type {ExportData} from "../exports";
import WebsiteContent from "./website-content";
import Icon from "@/components/ui/icon";
import {useUnsavedChanges, useConfirmNavigation} from "@/components/forms/unsaved-changes";
import {initialSettings, modules} from "../data/modules";
import type {AdminRow, Module} from "../types";
import {bookingGradient, bookingStatuses} from "../utils";
import {api} from "@/lib/api-client";
import {revenueSeries} from "../revenue";
import {canAccess} from "@/features/auth/permissions";

const currency = (value: string | number) => `SAR ${Number(value || 0).toLocaleString("en-US", {maximumFractionDigits: 2})}`;
const groups = [
  {label:"WORKSPACE",items:[["overview","Dashboard","grid"],["bookings","Bookings","calendar"],["customers","Customers","users"]]},
  {label:"OPERATIONS",items:[["drivers","Drivers","driver"],["vehicles","Vehicles","vehicle"],["fares","Fares & routes","route"],["areas","Service areas","map"]]},
  {label:"BUSINESS",items:[["offers","Offers & packages","ticket"],["payments","Payments","wallet"],["feedback","Feedback","star"]]},
  {label:"MANAGEMENT",items:[["content","Website content","window"],["reports","Reports","chart"],["roles","Team & roles","access"],["settings","Settings","sliders"]]},
];
function AdminIcon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,React.ReactNode>={grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,chart:<><path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/></>,settings:<><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,download:<><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></>,search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,plus:<path d="M12 5v14M5 12h14"/>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,close:<path d="m6 6 12 12M6 18 18 6"/>};
  Object.assign(paths, {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/></>,
    driver: <><circle cx="12" cy="7" r="3"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/><circle cx="12" cy="18" r="3"/><path d="M9 18h6m-3 0v3"/></>,
    vehicle: <><path d="m5 10 2-6h10l2 6M5 10h14a2 2 0 0 1 2 2v6H3v-6a2 2 0 0 1 2-2Zm0 8v3m14-3v3M7 14h1m8 0h1"/></>,
    route: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M9 5h7a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></>,
    ticket: <><path d="M3 8V5h18v3a4 4 0 0 0 0 8v3H3v-3a4 4 0 0 0 0-8Zm12-3v2m0 4v2m0 4v2"/></>,
    wallet: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18m0 4h-6v4h6M7 5V3h11"/></>,
    message: <><path d="M21 14a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7ZM7 8h10M7 12h6"/></>,
    window: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M7 6h.01m3 0h.01"/></>,
    access: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    sliders: <><path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></>,
  });
  return paths[name] ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> : <Icon name={name} size={size}/>;
}
function Badge({value}:{value:string}) {
  const tone=["Completed","Available","Paid","Active","Approved","Resolved","Published"].includes(value)?"green":["Confirmed","On a ride","Queued"].includes(value)?"blue":["Pending","Invited","Maintenance"].includes(value)?"amber":["Cancelled","Rejected","Disabled"].includes(value)?"red":value==="Refunded"?"purple":"gray";
  return <span className={`adm-badge ${tone}`}><i/>{value}</span>;
}

function RecordDialog({moduleKey,record,definition,drivers,vehicles,onClose,onSave,onDelete,onAction,editable}:{moduleKey:string;record:AdminRow;definition:Module;drivers:AdminRow[];vehicles:AdminRow[];onClose:()=>void;onSave:(row:AdminRow)=>Promise<void>;onDelete:()=>Promise<void>;onAction:(row:AdminRow,message:string)=>Promise<void>;editable:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const form=useRef<HTMLFormElement>(null);
  const [draft,setDraft]=useState({...record});
  const [requestError, setRequestError] = useState("");
  const [working, setWorking] = useState(false);
  async function perform(action: () => Promise<void>) {if (working || !editable) return; setWorking(true); setRequestError(""); try {await action();} catch (error) {setRequestError(error instanceof Error ? error.message : "Unable to save. Please try again.");} finally {setWorking(false);}}
  const confirmClose = useUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(record), () => setDraft({...record}));
  const closeEditor = () => {if (!working) confirmClose(onClose);};
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [receipt,setReceipt]=useState(false);
  useEffect(()=>{const element=dialog.current;if(element && !element.open) element.showModal();return ()=>element?.close();},[]);
  const action=(status:string,message:string)=>{if(form.current?.reportValidity()) void perform(() => onAction({...draft,status},message));};
  return <dialog ref={dialog} className="adm-dialog" aria-labelledby="admin-dialog-title" onCancel={event => {event.preventDefault(); closeEditor();}} onClick={event=>{if(isDialogBackdropClick(event))closeEditor();}}>
    <div className="adm-dialog-top"><div><span className="adm-overline">{record.id.startsWith("NEW")?"NEW RECORD":record.id} · OPERATIONS</span><h2 id="admin-dialog-title">{receipt?"Receipt preview":record.id.startsWith("NEW")?`Add ${definition.singular}`:`Manage ${definition.singular}`}</h2></div><button className="adm-icon-button" onClick={closeEditor} aria-label="Close dialog"><AdminIcon name="close"/></button></div>
    {receipt?<div className="adm-receipt"><span className="adm-badge amber">PAYMENT RECORD</span><h3>Falak Rides</h3><p>{draft.customer} · {draft.booking}</p><strong>{currency(draft.amount)}</strong><p>{draft.method} · {draft.status}</p><button className="adm-button secondary" onClick={()=>setReceipt(false)}>Back to payment</button></div>:<form ref={form} onSubmit={event=>{event.preventDefault();void perform(() => onSave(draft));}}>
      {moduleKey==="bookings"&&!record.id.startsWith("NEW")&&<div className="adm-quick-actions"><button type="button" onClick={()=>action("Confirmed","Booking confirmed.")}>Confirm</button><button type="button" onClick={()=>action("Rejected","Booking rejected.")}>Reject</button><button type="button" onClick={()=>action("Cancelled","Booking cancelled.")}>Cancel ride</button><button type="button" onClick={()=>document.getElementById("adm-date")?.focus()}>Reschedule</button><button type="button" onClick={()=>document.getElementById("adm-driver")?.focus()}>Assign ride</button><span>Changes to pickup and assignments take effect when you save.</span></div>}
      {moduleKey==="payments"&&<div className="adm-quick-actions"><button type="button" onClick={()=>setReceipt(true)}>Preview receipt</button><button type="button" onClick={()=>action("Refunded","Refund recorded.")}>Record refund</button></div>}
      {moduleKey==="notifications"&&<div className="adm-quick-actions"><button type="button" onClick={()=>action("Draft","send")}>Send notification</button><span>Delivery requires a configured provider.</span></div>}
      {requestError && <p role="alert" className="adm-account-error">{requestError}</p>}<div className="adm-dialog-fields">{definition.fields.map(field=>{
        let options=field.options; if (moduleKey === "feedback" && field.key === "rating" && draft.type === "Inquiry") options = [""];
        if(moduleKey==="bookings"&&field.key==="driver")options=["Unassigned",...drivers.map(row=>row.id)];
        if(moduleKey==="bookings"&&field.key==="vehicle")options=["Unassigned",...vehicles.map(row=>row.id)];
        if(options&&draft[field.key]&&!options.includes(draft[field.key]))options=[draft[field.key],...options];
        if(options)options=Array.from(new Set(options));
        return <label key={field.key} className={field.type==="textarea"?"wide":""}>{field.label}{field.required&&" *"}{field.type==="select"?<select disabled={!editable || working} id={`adm-${field.key}`} value={draft[field.key]||options?.[0]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}>{options?.map(option=><option key={option} value={option}>{field.key === "driver" ? drivers.find(row => row.id === option)?.name || option : field.key === "vehicle" ? vehicles.find(row => row.id === option)?.name || option : option}</option>)}</select>:field.type==="textarea"?<textarea disabled={!editable || working} id={`adm-${field.key}`} rows={3} maxLength={1500} value={draft[field.key]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>:<input readOnly={field.key === "trips"} disabled={!editable || working} id={`adm-${field.key}`} required={field.required} type={field.type||"text"} min={field.type==="number"?(field.key==="passengers"?1:0):undefined} max={field.key==="discount"?100:undefined} step={field.type==="number"?(["passengers","luggage","trips"].includes(field.key)?"1":"0.01"):undefined} maxLength={200} value={draft[field.key]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>}</label>;
      })}</div>
      <div className="adm-dialog-note"><Icon name="shield" size={16}/> Changes are saved to your operations workspace.</div>
      {confirmDelete&&<div className="adm-delete-confirm" role="alert">Remove this record? <button type="button" disabled={working || !editable} onClick={() => {void perform(onDelete);}}>Yes, remove</button><button type="button" onClick={()=>setConfirmDelete(false)}>Keep record</button></div>}
      <div className="adm-dialog-footer">{!record.id.startsWith("NEW")&&<button type="button" className="adm-danger" disabled={working || !editable} onClick={()=>{if(moduleKey==="customers") void perform(onDelete); else setConfirmDelete(true);}}>Remove record</button>}<div><button type="button" className="adm-button secondary" onClick={closeEditor}>Cancel</button><button className="adm-button" disabled={working || !editable} type="submit">Save changes</button></div></div>
    </form>}
  </dialog>;
}

type Snapshot = {data: Record<string, AdminRow[]>; settings: {name: string; phone: string; email: string; currency: string; timezone: string; description: string; version: number} | null; notices: {noticeId: string; read: boolean; dismissed: boolean}[]; user: {id: string; name: string; role: string}};
export default function AdminApp({initial}: {initial: Snapshot}) {
  const pathname = usePathname();
  const requestedSection = adminSectionFromPath(pathname) || "overview";
  const section = requestedSection === "overview" || canAccess(initial.user.role, requestedSection) ? requestedSection : "overview";
  const [contentActionsTarget,setContentActionsTarget]=useState<HTMLDivElement|null>(null);
  const [data,setData]=useState(initial.data);
  const [busy, setBusy] = useState(false);
  const [search,setSearch]=useState("");
  const [globalSearch,setGlobalSearch]=useState("");
  const [status,setStatus]=useState("All statuses");
  const [dateFilter,setDateFilter]=useState("All dates");
  const [menu,setMenu]=useState(false);
  const [loggingOut,setLoggingOut]=useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutError,setLogoutError]=useState("");
  const [editor,setEditor]=useState<{key:string;row:AdminRow}|null>(null);
  const [toast,setToast]=useState("");
  const [customerImport,setCustomerImport]=useState(false);
  const [exportData,setExportData]=useState<ExportData|null>(null);
  const initialCompany = initial.settings || {...initialSettings, version: 0};
  const [settings,setSettings]=useState(initialCompany);
  const [savedSettings, setSavedSettings] = useState(initialCompany);
  useUnsavedChanges(section === "settings" && JSON.stringify(settings) !== JSON.stringify(savedSettings), () => setSettings(savedSettings));
  const confirmNavigation = useConfirmNavigation();
  const today = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"});
  const [reportFrom,setReportFrom]=useState(today.slice(0, 7) + "-01");
  const [reportTo,setReportTo]=useState(today);
  const [chartPeriod,setChartPeriod]=useState("7 days");
  const revenue = revenueSeries(data.payments, chartPeriod === "7 days" ? 7 : 30);
  const heading=section==="overview"?"Dashboard":section==="reports"?"Reports":section==="settings"?"Settings":modules[section]?.title;
  const activeModule=section === "content" ? undefined : modules[section];
  const bookings=data.bookings;
  const pending=bookings.filter(row=>row.status==="Pending").length;
  const paid=data.payments.filter(row=>row.status==="Paid").reduce((sum,row)=>sum+Number(row.amount||0),0);
  const filtered=activeModule?data[section].filter(row=>(status==="All statuses"||row.status===status)&&Object.values(row).some(value=>value.toLowerCase().includes(search.toLowerCase()))&&(section!=="bookings"||dateFilter==="All dates"||row.date===today)):[];
  const reportRows=bookings.filter(row=>(!reportFrom||row.date>=reportFrom)&&(!reportTo||row.date<=reportTo));
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),6000);return ()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(!menu)return;const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenu(false);};document.addEventListener("keydown",key);return ()=>document.removeEventListener("keydown",key);},[menu]);
  function logout() {
    if (loggingOut) return;
    setConfirmLogout(true);
  }
  async function performLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api("/api/auth/sign-out", {method: "POST", body: "{}"});
      window.location.replace("/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }
  function navigate(key:string) {if (key === section) return; confirmNavigation(() => performNavigate(key));}
  function performNavigate(key:string) {document.getElementById("admin-main")?.scrollTo({top:0,left:0,behavior:"instant"});window.history.pushState(null, "", adminSectionPath(key));setSearch("");setStatus("All statuses");setDateFilter("All dates");setMenu(false);}
  async function save(key:string,row:AdminRow,_message?:string) {
    if (busy) return; setBusy(true);
    try {if (key === "payments" && row.status === "Refunded" && row.method === "Card") {await api(`/api/admin/payments/${encodeURIComponent(row.id)}/refund`, {method: "POST", body: JSON.stringify({version: Number(row._version)})}); setEditor(null); setToast("Refund submitted to the payment provider."); return;} const create = row.id === "NEW"; const result = await api<{row: AdminRow; invitation?: string; warning?: string}>(`/api/admin/${key}${create ? "" : `/${encodeURIComponent(row.id)}`}`, {method: create ? "POST" : "PATCH", body: JSON.stringify(row)}); setData(current => ({...current, [key]: create ? [result.row, ...current[key]] : current[key].map(item => item.id === row.id ? result.row : item)})); setEditor(null); if (key === "notifications" && _message === "send") await api(`/api/admin/notifications/${encodeURIComponent(result.row.id)}/send`, {method: "POST", body: "{}"}); setToast(result.warning || (result.invitation ? `Account invitation (valid 24 hours): ${window.location.origin}${result.invitation}` : "Changes saved."));}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to save. Your edits are still open."); throw error;} finally {setBusy(false);}
  }
  async function removeRecord(target: {key: string; row: AdminRow} | null = editor) {
    if (!target || busy) return; setBusy(true);
    try {await api(`/api/admin/${target.key}/${encodeURIComponent(target.row.id)}`, {method: "DELETE", body: JSON.stringify({version: Number(target.row._version)})}); setData(current => ({...current, [target.key]: current[target.key].filter(row => row.id !== target.row.id)})); setEditor(current => current?.key === target.key && current.row.id === target.row.id ? null : current); setToast("Record removed.");}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to remove this record."); throw error;} finally {setBusy(false);}
  }
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {const result = await api<{settings: typeof initialCompany}>("/api/admin/settings", {method: "PUT", body: JSON.stringify(settings)}); setSettings(result.settings); setSavedSettings(result.settings); setToast("Company settings saved.");}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to save settings.");} finally {setBusy(false);}
  }
  useEffect(() => {let active = true; const timer = setInterval(async () => {if (document.hidden) return; try {const result = await api<Snapshot>("/api/admin"); if (active) setData(result.data);} catch { /* Keep the last successful snapshot while disconnected. */ }}, 5000); return () => {active = false; clearInterval(timer);};}, []);
  function add(key:string) {const row:AdminRow={id:"NEW"};modules[key].fields.forEach(field=>{row[field.key]=field.options?.[0]||"";});setEditor({key,row});}
  function exportRows(key:string,rows:AdminRow[]) {if(!rows.length){setToast("No rows match your filters.");return;}setExportData({name:key,title:modules[key]?.title || "Booking report",rows:rows.map(row=>({...row}))});}
  function table(key:string,rows:AdminRow[]) {
    const definition=modules[key];
    return <div className={`adm-table-scroll ${key === "customers" ? "adm-customers-table" : ""}`}><table className="adm-table"><thead><tr><th scope="col">Reference</th>{definition.columns.map(column=><th scope="col" key={column}>{definition.fields.find(field=>field.key===column)?.label.replace(" (KSA)","").replace(" (SAR)","")||column}</th>)}<th scope="col"><span className="adm-sr-only">Actions</span></th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><button className="adm-id" onClick={()=>setEditor({key,row})}>{row.id}</button></td>{definition.columns.map(column=><td key={column}>{column==="status"?<Badge value={row[column]||"Draft"}/>:column==="customer"||column==="name"?<span className="adm-person"><span className="adm-avatar">{row[column]?.split(" ").map(part=>part[0]).slice(0,2).join("")}</span>{row[column]}</span>:["fare","amount","hourly","waiting"].includes(column)?currency(row[column]):column==="discount"?`${row[column]}%`:column==="date"?<span>{row.date}<small className="adm-cell-sub">{row.time} KSA</small></span>:row[column]||"—"}</td>)}<td>{key==="customers"&&<button type="button" className="adm-customer-delete" disabled={busy || !canAccess(initial.user.role, "customers", true)} aria-label={`Delete ${row.name || row.id}`} onClick={()=>{void removeRecord({key,row}).catch(()=>{});}}>Delete</button>}<button className="adm-row-action" onClick={()=>setEditor({key,row})} aria-label={`Manage ${row.id}`}>Manage <span aria-hidden="true">↗</span></button></td></tr>)}</tbody></table>{!rows.length&&<div className="adm-empty"><AdminIcon name="search" size={30}/><h3>No records found</h3><p>Try a different search or add your first record.</p></div>}</div>;
  }
  return <div className="admin-app">
    <a className="adm-skip" href="#admin-main">Skip to dashboard content</a>
    {menu&&<button className="adm-scrim" onClick={()=>setMenu(false)} aria-label="Close sidebar"/>}
    <aside className={`adm-sidebar ${menu?"is-open":""}`} id="admin-navigation">
      <Link className="adm-brand" href="/admin" aria-label="Falak Rides admin dashboard"><BrandLogo size={40}/></Link>
      <nav aria-label="Admin navigation"><div className="adm-nav-group">{groups.flatMap(group=>group.items).filter(([key]) => key === "overview" || canAccess(initial.user.role, key)).map(([key,label,icon])=><Link href={adminSectionPath(key)} key={key} className={section===key?"active":""} aria-current={section===key?"page":undefined} onClick={event=>{if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;event.preventDefault();navigate(key);}}><AdminIcon name={icon}/><span>{label}</span>{key==="bookings"&&pending>0&&<small>{pending}</small>}</Link>)}</div>
      <div className="adm-sidebar-bottom">
        <button type="button" className="adm-sidebar-logout" disabled={loggingOut} onClick={logout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4"/></svg>
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
        {logoutError && <p className="adm-sidebar-logout-error" role="alert">{logoutError}</p>}
      </div>
      </nav>
    </aside>
    <div className="adm-work-area">
      <header className="adm-topbar"><div className="adm-breadcrumb"><button className="adm-icon-button adm-mobile-menu" aria-expanded={menu} aria-controls="admin-navigation" onClick={()=>setMenu(!menu)} aria-label="Toggle admin navigation"><AdminIcon name="menu"/></button><span>Workspace</span><span>/</span><strong>{heading}</strong></div><div className="adm-topbar-right"><form className="adm-global-search" role="search" onSubmit={event=>{event.preventDefault();navigate("bookings");setSearch(globalSearch);}}><span className="adm-global-search-icon"><AdminIcon name="search" size={18}/></span><input aria-label="Search bookings" placeholder="Search bookings..." value={globalSearch} onChange={event=>setGlobalSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Escape")setGlobalSearch("");}}/>{globalSearch&&<button className="adm-global-search-clear" type="button" aria-label="Clear search" onClick={()=>setGlobalSearch("")}><AdminIcon name="close" size={15}/></button>}<button className="adm-global-search-submit" type="submit" aria-label="Search bookings"><span>Search</span><Icon name="arrow" size={15}/></button></form><NotificationCenter initialState={initial.notices} bookings={bookings} notifications={data.notifications} onOpen={(key,row)=>{if(key!=="notifications")navigate(key);setEditor({key,row});}}/><AdminProfile onNavigate={navigate}/></div></header>
      <main id="admin-main" className="adm-main">
        <div className={`adm-page-title ${section === "content" ? "cms-sticky-heading" : ""}`}><div><span className="adm-overline">FALAK RIDES / ADMIN</span><h1>{section==="overview"?"A clear view of your journeys.":heading}</h1><p>{section==="overview"?"Welcome back. Here’s your operations snapshot.":activeModule?.description|| (section==="reports"?"Turn your booking data into a useful report.":section === "content" ? "Edit your website, save a draft and publish when ready." : "Company details and workspace preferences.")}</p></div><div ref={section==="content"?setContentActionsTarget:undefined} className={`adm-page-actions ${section==="content"?"cms-page-actions":""}`}>{section==="overview"?<><button className="adm-button secondary" onClick={()=>exportRows("bookings",bookings)}><AdminIcon name="download" size={17}/> Export report</button><button className="adm-button" disabled={!canAccess(initial.user.role, "bookings", true)} onClick={()=>add("bookings")}><AdminIcon name="plus" size={18}/> New booking</button></>:activeModule&&<>{section==="customers"&&<button className="adm-button secondary" disabled={!canAccess(initial.user.role, "customers", true)} onClick={()=>setCustomerImport(true)}>Import spreadsheet</button>}<button className="adm-button secondary" onClick={()=>exportRows(section,filtered)}><AdminIcon name="download" size={17}/> Export</button><button className="adm-button" disabled={!canAccess(initial.user.role, section, true)} onClick={()=>add(section)}><AdminIcon name="plus" size={18}/> Add {activeModule.singular}</button></>}</div></div>
        {canAccess(initial.user.role, "content", true) && <div hidden={section!=="content"}><WebsiteContent actionsTarget={contentActionsTarget}/></div>}
        {section==="content"?null:section==="overview"?<>
          <div className="adm-stat-grid">{[{label:"Total bookings",value:String(bookings.length),icon:"car",detail:"Booking records",tone:"mint"},{label:"Recorded revenue",value:currency(paid),icon:"bag",detail:"Paid transactions",tone:"sand"},{label:"Pending requests",value:String(pending),icon:"clock",detail:"Ready for your review",tone:"blue"},{label:"Available drivers",value:String(data.drivers.filter(row=>row.status==="Available").length),icon:"user",detail:`${data.drivers.length} drivers in your fleet`,tone:"lilac"}].map(stat=><article className={`adm-stat ${stat.tone}`} key={stat.label}><div><span>{stat.label}</span><span className="adm-stat-icon"><AdminIcon name={stat.icon}/></span></div><strong>{stat.value}</strong><small>{stat.label==="Pending requests"&&<span className="adm-small-dot"/>}{stat.detail}</small></article>)}</div>
          <div className="adm-analytics-grid"><section className="adm-panel"><div className="adm-panel-head"><div><h2>Revenue overview</h2><p>Recorded revenue · SAR</p></div><select aria-label="Revenue chart period" value={chartPeriod} onChange={event=>setChartPeriod(event.target.value)}><option>7 days</option><option>30 days</option></select></div><div className="adm-chart-summary"><strong>{currency(revenue.total)}</strong><span>Paid transactions in the selected period</span></div><div className="adm-chart"><div className="adm-chart-y">{revenue.ticks.map(tick => <span key={tick}>{tick}</span>)}</div><div className="adm-chart-plot"><svg viewBox="0 0 640 180" role="img" aria-label={`Recorded revenue for ${chartPeriod}`} preserveAspectRatio="none"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--adm-green)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--adm-green)" stopOpacity="0"/></linearGradient></defs>{[10,50,90,130,170].map(y=><line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#edf0eb" strokeDasharray="4 4"/>)}<path d={revenue.fill} fill="url(#revenue-fill)"/><path d={revenue.path} fill="none" stroke="var(--adm-green)" strokeWidth="3"/></svg><div className="adm-chart-x">{revenue.labels.map(day=><span key={day}>{day}</span>)}</div></div></div></section>
          <section className="adm-panel"><div className="adm-panel-head"><div><h2>Booking status</h2><p>Current records</p></div><Icon name="car" size={20}/></div><div className="adm-donut" style={{background:bookingGradient(bookings)}}><div><strong>{bookings.length}</strong><span>Total bookings</span></div></div><div className="adm-status-legend">{bookingStatuses.map(value=><div key={value}><span><i className={value.toLowerCase()}/>{value}</span><strong>{bookings.filter(row=>row.status===value).length}</strong></div>)}</div></section></div>
          <section className="adm-panel adm-recent"><div className="adm-panel-head"><div><h2>Recent bookings <span className="adm-count">{bookings.length}</span></h2><p>Your latest journeys at a glance.</p></div><button className="adm-text-button" onClick={()=>navigate("bookings")}>View all bookings <Icon size={16}/></button></div>{table("bookings",bookings.slice(0,5))}</section>
          <div className="adm-bottom-grid"><section className="adm-panel"><div className="adm-panel-head"><div><h2>Driver availability</h2><p>A little clarity for your next assignment.</p></div><button className="adm-text-button" onClick={()=>navigate("drivers")}>Manage <Icon size={16}/></button></div>{data.drivers.slice(0,3).map(driver=><button className="adm-driver-row" key={driver.id} onClick={()=>setEditor({key:"drivers",row:driver})}><span className="adm-avatar">{driver.name.split(" ").map(n=>n[0]).join("")}</span><span><strong>{driver.name}</strong><small>{driver.city} · {driver.vehicle}</small></span><Badge value={driver.status}/></button>)}</section><section className="adm-next-step"><span className="adm-stat-icon"><Icon name="clock"/></span><h2>A smoother day starts<br/>with a clear schedule.</h2><p>{pending} requests are waiting for review. Check the route, assign a driver and plan the next journey.</p><button className="adm-button" onClick={()=>{navigate("bookings");setStatus("Pending");}}>Review pending requests <Icon size={17}/></button></section></div>
        </>:activeModule?<>
          {section==="roles"&&<div className="adm-info-note"><Icon name="shield" size={19}/><span><strong>Workspace roles.</strong> Administrator: all modules. Dispatcher: bookings and operations. Finance: payments and reports. Viewer: read only. Permissions are enforced for every request.</span></div>}
          <section className="adm-panel"><div className="adm-table-toolbar"><div className="adm-search"><AdminIcon name="search" size={18}/><input aria-label={`Search ${activeModule.title}`} placeholder={`Search ${activeModule.title.toLowerCase()}...`} value={search} onChange={event=>setSearch(event.target.value)}/></div><div>{activeModule.fields.some(field=>field.key==="status")&&<select aria-label="Filter by status" value={status} onChange={event=>setStatus(event.target.value)}><option>All statuses</option>{Array.from(new Set(data[section].map(row=>row.status).filter(Boolean))).map(value=><option key={value}>{value}</option>)}</select>}{section==="bookings"&&<select aria-label="Filter booking date" value={dateFilter} onChange={event=>setDateFilter(event.target.value)}><option>All dates</option><option>Today</option></select>}</div></div>{table(section,filtered)}<div className="adm-table-footer">Showing {filtered.length} of {data[section].length} records<span>Changes are saved to your workspace.</span></div></section>
        </>:section==="reports"?<section className="adm-panel adm-report"><span className="adm-stat-icon"><AdminIcon name="chart" size={25}/></span><h2>Booking report</h2><p>Choose a pickup date range and export the current bookings in your preferred format.</p><div className="adm-report-filters"><label>From<input type="date" value={reportFrom} onChange={event=>setReportFrom(event.target.value)}/></label><label>Through<input type="date" min={reportFrom} value={reportTo} onChange={event=>setReportTo(event.target.value)}/></label><button className="adm-button" disabled={reportFrom>reportTo} onClick={()=>exportRows("booking-report",reportRows)}><AdminIcon name="download" size={18}/> Export report</button></div><div className="adm-report-stats"><div><small>Matching bookings</small><strong>{reportRows.length}</strong></div><div><small>Completed fare total</small><strong>{currency(reportRows.filter(row=>row.status==="Completed").reduce((sum,row)=>sum+Number(row.fare||0),0))}</strong></div><div><small>Pending requests</small><strong>{reportRows.filter(row=>row.status==="Pending").length}</strong></div></div>{table("bookings",reportRows)}</section>:<section className="adm-panel adm-settings"><div className="adm-panel-head"><div><h2>Company information</h2><p>Manage business details.</p></div><Icon name="shield"/></div><form onSubmit={saveSettings}><div className="adm-dialog-fields">{Object.entries(settings).filter(([key]) => !["id", "version", "updatedAt"].includes(key)).map(([key,value])=><label key={key} className={key==="description"?"wide":""}>{({name:"Business name",phone:"Contact number",email:"Email address",currency:"Currency",timezone:"Timezone",description:"Description"} as Record<string,string>)[key]}{key==="description"?<textarea value={String(value)} maxLength={600} onChange={event=>setSettings({...settings,[key]:event.target.value})}/>:<input required type={key==="email"?"email":"text"} value={String(value)} readOnly={key==="currency"||key==="timezone"} onChange={event=>setSettings({...settings,[key]:event.target.value})}/>}</label>)}</div><div className="adm-settings-footer"><p>Saved business details update the public website.</p><button className="adm-button" type="submit">Save settings</button></div></form></section>}
        {section === "settings" && canAccess(initial.user.role, "settings", true) && <PasswordSettings/>}
      </main>
    </div>
    {editor&&<RecordDialog editable={canAccess(initial.user.role, editor.key, true)} key={`${editor.key}-${editor.row.id}`} moduleKey={editor.key} definition={modules[editor.key]} record={editor.row} drivers={data.drivers} vehicles={data.vehicles} onClose={()=>setEditor(null)} onSave={row=>save(editor.key,row)} onAction={(row,message)=>save(editor.key,row,message)} onDelete={removeRecord}/>}
    {customerImport&&<CustomerImport onClose={()=>setCustomerImport(false)} onImported={message=>{setCustomerImport(false);setToast(message);setSearch("");void api<Snapshot>("/api/admin").then(result=>setData(result.data)).catch(()=>setToast(`${message} Refresh to see the latest customer list.`));}}/>}
    {exportData&&<ExportDialog data={exportData} onClose={()=>setExportData(null)}/>}
    {toast&&<div className="adm-toast" role="status"><Icon name="check" size={18}/>{toast}<button onClick={()=>setToast("")} aria-label="Dismiss notification"><AdminIcon name="close" size={16}/></button></div>}
    {confirmLogout && <ConfirmationDialog title="Log out?" description="Are you sure you want to log out of your account?" confirmLabel="Logout" onCancel={() => setConfirmLogout(false)} onConfirm={() => {setConfirmLogout(false); confirmNavigation(() => {void performLogout();});}}/>}
  </div>;
}
