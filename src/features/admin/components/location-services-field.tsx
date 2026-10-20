import type {AdminRow} from "../types";
import "./location-services-field.css";

export function selectedServiceIds(value:string):string[] {
  try {const ids:unknown=JSON.parse(value);return Array.isArray(ids)?ids.filter((id):id is string=>typeof id==="string"):[];}catch{return [];}
}

export default function LocationServicesField({value,services,disabled,onChange}:{value:string;services:AdminRow[];disabled:boolean;onChange:(value:string)=>void}) {
  const id=useId();
  const selected=selectedServiceIds(value);
  const available=services.filter(service=>!selected.includes(service.id));
  return <div className="adm-location-services wide">
    <label htmlFor={id}>Services</label>
    <select id={id} value="" disabled={disabled} required={!selected.length} aria-describedby={`${id}-hint`} onChange={event=>{if(event.target.value)onChange(JSON.stringify([...selected,event.target.value]));}}>
      <option value="" disabled>{!services.length?"No services available":!available.length?"All services selected":"Select services"}</option>
      {available.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}
    </select>
    {!!selected.length&&<div className="adm-selected-services" aria-label="Selected services">{selected.map(serviceId=>{const name=services.find(service=>service.id===serviceId)?.name||"Unavailable service";return <span key={serviceId}>{name}<button type="button" disabled={disabled} aria-label={`Remove ${name}`} onClick={()=>onChange(JSON.stringify(selected.filter(id=>id!==serviceId)))}>×</button></span>;})}</div>}
    <small id={`${id}-hint`}>{services.length?"Select a service to add it. You can select more than one.":"Add a service in Our Services before creating a location."}</small>
  </div>;
}
import {useId} from "react";
