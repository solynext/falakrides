"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {isDialogBackdropClick} from "@/lib/dialog-events";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import {ServiceRecordsEditor} from "./service-records-editor";
import type {ServiceLocation} from "./service-locations-field";
import type {WebsiteService} from "@/features/content/website-model";
import "./services-manager.css";

type Catalog={version:number;services:WebsiteService[];locations:ServiceLocation[]};
export default function ServicesManager({actionsTarget}:{actionsTarget:HTMLDivElement|null}) {
  const [saved,setSaved]=useState<Catalog|null>(null);
  const [services,setServices]=useState<WebsiteService[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editing,setEditing]=useState<WebsiteService[]|null>(null);
  const [locationIds,setLocationIds]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("All statuses");
  const [uploading,setUploading]=useState(false);
  const pending=useRef(false);
  const editor=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(selectedId&&editor.current&&!editor.current.open)editor.current.showModal();},[selectedId]);
  const dirty=!!saved && !!editing && (JSON.stringify(editing)!==JSON.stringify(services)||JSON.stringify([...locationIds].sort())!==JSON.stringify(saved.locations.filter(location=>location.serviceIds.includes(selectedId||"")).map(location=>location.id).sort()));
  const confirmDiscard=useUnsavedChanges(dirty,()=>{setEditing(null);setSelectedId(null);});
  async function load() {
    setBusy(true);setError("");
    try {const response=await fetch("/api/admin/services",{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load services.");setSaved(result);setServices(result.services);}
    catch(error){setError(error instanceof Error?error.message:"Unable to load services.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{const timer=setTimeout(()=>{void load();},0);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{
    if(editing)return;
    let active=true;let refreshing=false;
    async function refresh() {
      if(document.hidden||pending.current||refreshing)return;
      refreshing=true;
      try {const response=await fetch("/api/admin/services",{cache:"no-store"});if(!response.ok)return;const result:Catalog=await response.json();if(active){setSaved(result);setServices(result.services);}}
      catch { /* Preserve the last snapshot if a refresh fails. */ }
      finally{refreshing=false;}
    }
    const timer=setInterval(()=>{void refresh();},5000);
    window.addEventListener("focus",refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[editing]);
  async function save(next:WebsiteService[]=editing||services) {
    if(!saved||pending.current||uploading)return;
    pending.current=true;setBusy(true);setError("");setNotice("");
    try {const response=await fetch("/api/admin/services",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:saved.version,services:next,...(selectedId&&next.some(service=>service.id===selectedId)?{locationAssignments:{[selectedId]:locationIds}}:{})})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save services.");setSaved(result);setServices(result.services);setEditing(null);setSelectedId(null);setNotice("Service saved.");}
    catch(error){setError(error instanceof Error?error.message:"Unable to save services.");}
    finally{pending.current=false;setBusy(false);}
  }
  function addService() {
    const suffix=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const service:WebsiteService={id:`service-${suffix}`,visible:false,slug:"",title:"",heading:"",image:"",intro:"",sections:[]};
    setLocationIds([]);setEditing([...services,service]);setSelectedId(service.id);setNotice("");setError("");
  }
  function updateServices(next:WebsiteService[]) {setEditing(next);setNotice("");}
  function closeEditor() {setEditing(null);setSelectedId(null);setError("");}
  function saveSelected(visible:boolean) {
    if(!editing)return;
    void save(editing.map(service=>service.id===selectedId?{...service,visible}:service));
  }
  const locked=busy||uploading;
  const selected=editing?.find(service=>service.id===selectedId);
  const isNew=!!selected&&!services.some(service=>service.id===selected.id);
  const matching=services.filter(service=>(status==="All statuses"||(status==="Published")===service.visible)&&`${service.title} ${service.slug}`.toLowerCase().includes(query.toLowerCase()));
  const actions=<><button className="adm-button" type="button" disabled={!saved||locked||services.length>=60} onClick={addService}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Add service</button></>;
  return <section className="services-manager" aria-label="Our Services management" aria-busy={busy}>
    {actionsTarget&&createPortal(actions,actionsTarget)}
    {error&&<div className="adm-cms-error" role="alert">{error} <button type="button" disabled={busy} onClick={()=>confirmDiscard(()=>{void load();})}>Reload services</button></div>}
    {notice&&<p className="adm-cms-success" role="status">{notice}</p>}
    {!saved?<p role="status">{busy?"Loading services…":"Services are unavailable."}</p>:<form id="services-manager-form" onSubmit={event=>{event.preventDefault();void save();}}>
      <section className="adm-panel">
        <div className="adm-table-toolbar">
          <div className="adm-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input type="search" aria-label="Search service pages" placeholder="Search our services..." value={query} onChange={event=>setQuery(event.target.value)}/></div>
          <div><select aria-label="Filter service status" value={status} onChange={event=>setStatus(event.target.value)}><option>All statuses</option><option>Published</option><option>Draft</option></select></div>
        </div>
        <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th scope="col">Service page</th><th scope="col">Page URL</th><th scope="col">Status</th><th scope="col">Manage</th></tr></thead><tbody>{matching.map(service=><tr key={service.id}>
          <td title={service.title}><span className="adm-person"><span className="adm-avatar">{service.title.split(" ").filter(Boolean).map(part=>part[0]).slice(0,2).join("")||"S"}</span><span className="adm-cell-text">{service.title||"Untitled service"}</span></span></td>
          <td title={`/services/${service.slug}`}>/services/{service.slug}</td>
          <td><span className={`adm-badge ${service.visible?"green":"gray"}`}><i/>{service.visible?"Published":"Draft"}</span></td>
          <td><div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:6}}><button type="button" className="adm-row-action" disabled={locked} aria-label={`Manage ${service.title||"service page"}`} onClick={()=>{setLocationIds(saved.locations.filter(location=>location.serviceIds.includes(service.id)).map(location=>location.id));setEditing(structuredClone(services));setSelectedId(service.id);setError("");setNotice("");}}>Manage <span aria-hidden="true">↗</span></button></div></td>
        </tr>)}</tbody></table>{!matching.length&&<div className="adm-empty"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><h3>No records found</h3><p>Try a different search or add your first service.</p></div>}</div>
        <div className="adm-table-footer">Showing {matching.length} of {services.length} records<span>{dirty?"You have unsaved changes.":"Changes are saved to your workspace."}</span></div>
      </section>
      {selected&&<dialog ref={editor} className="adm-dialog services-page-editor" aria-labelledby="service-dialog-title" onClose={closeEditor} onCancel={event=>{event.preventDefault();if(!locked)closeEditor();}} onClick={event=>{if(!locked&&isDialogBackdropClick(event))closeEditor();}}>
        <div className="adm-dialog-top"><div><h2 id="service-dialog-title">{isNew?"Add service":"Manage service"}</h2></div><button type="button" className="adm-icon-button app-x-button" disabled={locked} aria-label="Close dialog" onClick={closeEditor}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
        <div className="services-dialog-fields">{error&&<p className="adm-account-error" role="alert">{error}</p>}{notice&&<p className="adm-cms-success" role="status">{notice}</p>}<ServiceRecordsEditor locations={saved.locations} locationIds={locationIds} onLocationsChange={setLocationIds} services={editing!} isNew={isNew} selectedId={selected.id} disabled={busy} onBusyChange={setUploading} onChange={updateServices}/></div>
        <div className="adm-dialog-footer">{!isNew&&<button type="button" className="adm-danger" disabled={locked} onClick={()=>{void save(services.filter(service=>service.id!==selected.id));}}>Delete service</button>}<div><button type="button" className="adm-button secondary" disabled={locked} onClick={closeEditor}>Cancel</button><button type="button" className="adm-button" disabled={locked||!selected.title.trim()} onClick={()=>saveSelected(selected.visible)}>{busy?"Saving…":"Save service"}</button></div></div>
      </dialog>}
    </form>}
  </section>;
}
