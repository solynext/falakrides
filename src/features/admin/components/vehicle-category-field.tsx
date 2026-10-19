"use client";

import {useEffect, useRef, useState} from "react";
import {api} from "@/lib/api-client";
import {isDialogBackdropClick} from "@/lib/dialog-events";

type Category = {id:string;name:string};
type UpdatedVehicle = {id:string;version:number};
export default function VehicleCategoryField({value,onChange,disabled,canCreate,onBusyChange,onRename}:{value:string;onChange:(value:string)=>void;disabled:boolean;canCreate:boolean;onBusyChange:(busy:boolean)=>void;onRename:(from:string,to:string,vehicles:UpdatedVehicle[])=>void}) {
  const [categories,setCategories] = useState<Category[]>([]);
  const [loading,setLoading] = useState(true);
  const [managing,setManaging] = useState(false);
  const [name,setName] = useState("");
  const [editing,setEditing] = useState<Category|null>(null);
  const [editName,setEditName] = useState("");
  const [deleting,setDeleting] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [retry,setRetry] = useState(0);
  const popup = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!managing) return;
    const element = popup.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    return () => {element?.close();previousFocus?.focus({preventScroll:true});};
  },[managing]);
  function closeManager() {
    if (busy) return;
    setManaging(false);setEditing(null);setDeleting(null);setName("");setError("");
  }
  useEffect(() => {
    let active=true;
    api<{categories:Category[]}>("/api/admin/vehicle-categories").then(result => {if(active){setCategories(result.categories);setError("");}}).catch(error => {if(active)setError(error instanceof Error ? error.message : "Unable to load categories.");}).finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  },[retry]);
  useEffect(() => {
    if(busy)return;
    let active=true;
    const refresh=async()=>{if(document.hidden)return;try{const result=await api<{categories:Category[]}>("/api/admin/vehicle-categories");if(active)setCategories(result.categories);}catch{/* Keep saved choices available during a temporary connection failure. */}};
    const timer=setInterval(refresh,5000);
    window.addEventListener("focus",refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[busy]);
  async function perform(action:()=>Promise<void>) {
    if(busy || disabled || !canCreate)return;
    setBusy(true);onBusyChange(true);setError("");
    try {await action();}
    catch(error) {setError(error instanceof Error ? error.message : "Unable to update categories.");}
    finally {setBusy(false);onBusyChange(false);}
  }
  function sort(items:Category[]) {return items.sort((a,b) => a.name.localeCompare(b.name));}
  async function create() {
    if(!name.trim())return;
    await perform(async () => {
      const {category}=await api<{category:Category}>("/api/admin/vehicle-categories",{method:"POST",body:JSON.stringify({name:name.trim()})});
      setCategories(current => sort([...current,category]));
      onChange(category.name);setName("");
    });
  }
  async function rename() {
    if(!editing || !editName.trim())return;
    await perform(async () => {
      const result=await api<{category:Category;vehicles:UpdatedVehicle[]}>("/api/admin/vehicle-categories",{method:"PATCH",body:JSON.stringify({id:editing.id,previousName:editing.name,name:editName.trim()})});
      setCategories(current => sort(current.map(category => category.id === editing.id ? result.category : category)));
      onRename(editing.name,result.category.name,result.vehicles);setEditing(null);
    });
  }
  async function remove(category:Category) {
    await perform(async () => {
      await api("/api/admin/vehicle-categories",{method:"DELETE",body:JSON.stringify({id:category.id,previousName:category.name})});
      setCategories(current => current.filter(item => item.id !== category.id));
      if(value === category.name)onChange("");
      setDeleting(null);
    });
  }
  const errorMessage = error && <div className="adm-category-error" role="alert">{error}<button type="button" disabled={disabled || loading || busy} onClick={() => {setLoading(true);setRetry(current => current+1);}}>Reload categories</button></div>;
  return <div className="adm-vehicle-field">
    <div className="adm-category-label"><label htmlFor="adm-category">Category</label>{canCreate && <button type="button" disabled={disabled || loading || busy} aria-haspopup="dialog" aria-expanded={managing} aria-controls="adm-category-manager" onClick={() => {setManaging(true);setEditing(null);setDeleting(null);setError("");}}>Manage</button>}</div>
    <div className="adm-vehicle-input"><select id="adm-category" value={value} required disabled={disabled || loading || busy} onChange={event => onChange(event.target.value)}>
      <option value="" disabled>{loading ? "Loading categories…" : "Select category"}</option>
      {value && !categories.some(category => category.name === value) && <option value={value}>{value}</option>}
      {categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
    </select></div>
    {managing && canCreate && <dialog ref={popup} id="adm-category-manager" className="adm-dialog adm-category-dialog" aria-labelledby="adm-category-manager-title" onCancel={event => {event.preventDefault();event.stopPropagation();closeManager();}} onClick={event => {event.stopPropagation();if(isDialogBackdropClick(event))closeManager();}}>
      <div className="adm-dialog-top"><h2 id="adm-category-manager-title">Manage categories</h2><button type="button" className="app-x-button" aria-label="Close category manager" disabled={busy} onClick={closeManager}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <div className="adm-category-manager">
      <div className="adm-category-create"><div className="adm-vehicle-input"><input aria-label="New category name" placeholder="New category name" value={name} maxLength={80} disabled={disabled || busy} onChange={event => setName(event.target.value)} onKeyDown={event => {if(event.key === "Enter"){event.preventDefault();void create();}}}/></div><button type="button" className="adm-button" disabled={disabled || busy || !name.trim()} onClick={() => {void create();}}>Add category</button></div>
      {!categories.length && !loading && <p className="adm-category-empty">No categories yet.</p>}
      <ul className="adm-category-list">{categories.map(category => <li key={category.id}>
        {editing?.id === category.id ? <><div className="adm-vehicle-input"><input aria-label={`Rename ${category.name}`} value={editName} maxLength={80} disabled={disabled || busy} onChange={event => setEditName(event.target.value)} onKeyDown={event => {if(event.key === "Enter"){event.preventDefault();void rename();}}}/></div><div className="adm-category-actions"><button type="button" className="adm-button" disabled={disabled || busy || !editName.trim()} onClick={() => {void rename();}}>Save</button><button type="button" className="adm-button secondary" disabled={disabled || busy} onClick={() => setEditing(null)}>Cancel</button></div></> : <><span>{category.name}</span><div className="adm-category-actions"><button type="button" className="adm-button secondary" disabled={disabled || busy} onClick={() => {setEditing(category);setEditName(category.name);setDeleting(null);setError("");}} aria-label={`Rename ${category.name}`}>Rename</button><button type="button" className="adm-danger" disabled={disabled || busy} onClick={() => {setDeleting(category.id);setEditing(null);setError("");}} aria-label={`Delete ${category.name}`}>Delete</button></div></>}
        {deleting === category.id && <div className="adm-category-confirm"><span>Delete {category.name}?</span><button type="button" className="adm-danger" disabled={disabled || busy} onClick={() => {void remove(category);}}>Confirm delete</button><button type="button" className="adm-button secondary" disabled={disabled || busy} onClick={() => setDeleting(null)}>Cancel</button></div>}
      </li>)}</ul>
      {busy && <p role="status">Saving category changes…</p>}
      {errorMessage}
      </div>
    </dialog>}
    {!managing && errorMessage}
  </div>;
}
