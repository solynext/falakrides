import {useId} from "react";
import "./location-services-field.css";

export type ServiceLocation={id:string;name:string;serviceIds:string[]};
export default function ServiceLocationsField({locations,selected,disabled,onChange}:{locations:ServiceLocation[];selected:string[];disabled:boolean;onChange:(ids:string[])=>void}) {
  const id=useId();
  const available=locations.filter(location=>!selected.includes(location.id));
  return <div className="adm-location-services">
    <label htmlFor={id}>Locations</label>
    <select id={id} value="" disabled={disabled} onChange={event=>{if(event.target.value)onChange([...selected,event.target.value]);}} aria-describedby={`${id}-hint`}>
      <option value="" disabled>{!locations.length?"No locations available":!available.length?"All locations selected":"Select locations"}</option>
      {available.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}
    </select>
    {!!selected.length&&<div className="adm-selected-services" aria-label="Selected locations">{selected.map(locationId=>{const name=locations.find(location=>location.id===locationId)?.name||"Unavailable location";return <span key={locationId}>{name}<button type="button" disabled={disabled} aria-label={`Remove ${name}`} onClick={()=>onChange(selected.filter(id=>id!==locationId))}>×</button></span>;})}</div>}
    <small id={`${id}-hint`}>{locations.length?"Select one or more locations for this service.":"Create locations in Locations to select them here."}</small>
  </div>;
}
