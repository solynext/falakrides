"use client";
import {serviceSlug} from "@/features/services/slug";
import ContentImageField from "./content-image-field";
import ServiceLocationsField, {type ServiceLocation} from "./service-locations-field";
import type {WebsiteService} from "@/features/content/website-model";
import "./public-website-editor.css";
export function ServiceRecordsEditor({services,disabled,onChange,selectedId,onBusyChange,isNew=false,locations,locationIds,onLocationsChange}:{services:WebsiteService[];disabled:boolean;onChange:(services:WebsiteService[])=>void;selectedId?:string;isNew?:boolean;locations:ServiceLocation[];locationIds:string[];onLocationsChange:(ids:string[])=>void;onBusyChange?:(busy:boolean)=>void}) {
  function update(id:string,changes:Partial<WebsiteService>){onChange(services.map(service=>service.id===id?{...service,...changes}:service));}
  return <div className="website-service-records">
    {services.map((service)=>selectedId && service.id!==selectedId ? null : <article className="website-service-record" key={service.id}>
      <div className="website-service-core">
        <label><span>Service name <span className="service-required">*</span></span><input autoFocus required placeholder="e.g. Airport Transfers" type="text" maxLength={120} value={service.title} disabled={disabled} onChange={event=>update(service.id,{title:event.target.value,...(isNew?{slug:serviceSlug(event.target.value,services.filter(item=>item.id!==service.id).map(item=>item.slug)),...(service.heading===service.title?{heading:event.target.value}:{})}:{})})}/></label>
        <label>Description<textarea placeholder="Describe this service." rows={3} maxLength={6000} value={service.intro} disabled={disabled} onChange={event=>update(service.id,{intro:event.target.value})}/><small>Required to publish. You can finish this later by saving a draft.</small></label>
        <ServiceLocationsField locations={locations} selected={locationIds} disabled={disabled} onChange={onLocationsChange}/>
        <label>Status<select value={service.visible?"published":"draft"} disabled={disabled} onChange={event=>update(service.id,{visible:event.target.value==="published"})}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <div className="service-minimal-image"><span>Image <small>(optional)</small></span><ContentImageField resource="services" value={service.image} disabled={disabled} onBusyChange={onBusyChange} onChange={image=>update(service.id,{image})}/></div>
      </div>
    </article>)}
  </div>;
}
