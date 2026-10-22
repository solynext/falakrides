"use client";
import ContentImageField from "./content-image-field";
import {WEBSITE_FIELD, websiteCopyFields, websiteFromValues, type WebsiteGalleryPhoto} from "@/features/content/website-model";
import type {ContentSection} from "@/features/content/page-navigation";
import type {ContentValues} from "@/features/content/types";
import "./public-website-editor.css";

export default function PublicWebsiteEditor({values,onChange,disabled,section,query}: {values:ContentValues;onChange:(values:ContentValues)=>void;disabled:boolean;section:ContentSection;query:string}) {
  const data=websiteFromValues(values,true);
  const matches=(text:string)=>text.toLowerCase().includes(query.toLowerCase());
  function copy(key:string,value:string){onChange({...values,[WEBSITE_FIELD]:JSON.stringify({...data,copy:{...data.copy,[key]:value}})});}
  function row(id:string,key:string,value:string|boolean){const collection=section.collection;if(collection)onChange({...values,[WEBSITE_FIELD]:JSON.stringify({...data,[collection]:data[collection].map(item=>item.id===id?{...item,[key]:value}:item)})});}
  function galleryRows(update:(items:WebsiteGalleryPhoto[])=>WebsiteGalleryPhoto[]){onChange({...values,[WEBSITE_FIELD]:JSON.stringify({...data,gallery:update(data.gallery)})});}
  const fields=websiteCopyFields.filter(field=>section.copy.includes(field.key)&&matches(`${field.label} ${data.copy[field.key]}`));
  const rows=section.collection?data[section.collection].filter(item=>!(section.collection==="homeSections" && "key" in item && item.key==="reviews") && matches(JSON.stringify(item))):[];
  return <div className="website-manager">
    <div className="website-copy-grid">{fields.map(field=><label key={field.key}>{field.label}{field.image?<ContentImageField value={data.copy[field.key]} disabled={disabled} onChange={value=>copy(field.key,value)}/>:<textarea rows={field.value.length>90?4:2} maxLength={6000} value={data.copy[field.key]} onChange={event=>copy(field.key,event.target.value)}/>}</label>)}</div>
    {section.collection && <div className="website-records">{rows.map((item,index)=><article className="website-record" key={item.id}><div className="website-record-heading"><span className="website-item-index">{index+1}</span><h3>{"title" in item?item.title:"caption" in item?item.caption:"question" in item?item.question:"name" in item?item.name:"Untitled"}</h3>{section.collection==="gallery"&&"caption" in item&&<div className="website-gallery-actions"><button type="button" disabled={disabled||index===0} onClick={()=>galleryRows(items=>{const next=[...items];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})} aria-label={`Move ${item.caption} up`}>↑</button><button type="button" disabled={disabled||index===rows.length-1} onClick={()=>galleryRows(items=>{const next=[...items];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})} aria-label={`Move ${item.caption} down`}>↓</button><button type="button" disabled={disabled} onClick={()=>galleryRows(items=>items.filter(photo=>photo.id!==item.id))}>Remove</button></div>}</div>{section.collection==="gallery"&&"caption" in item&&<label className="website-gallery-visible"><input type="checkbox" checked={item.visible} disabled={disabled} onChange={event=>row(item.id,"visible",event.target.checked)}/> Show in public gallery</label>}<div className="website-record-fields cms-scoped-record">{Object.entries(item).filter(([key])=>!["id","visible"].includes(key)).map(([key,value])=><label key={key}>{{title:"Heading",text:"Description",image:"Image",alt:"Image description",caption:"Caption",category:"Category",question:"Question",answer:"Answer"}[key]||key}{key==="image"?<ContentImageField value={String(value)} disabled={disabled} onChange={value=>row(item.id,key,value)}/>:<textarea rows={key==="title"||key==="question"?2:3} maxLength={6000} value={String(value)} onChange={event=>row(item.id,key,String(event.target.value))}/>}</label>)}</div></article>)}</div>}
    {section.collection==="gallery"&&<button type="button" className="adm-button secondary website-gallery-add" disabled={disabled||data.gallery.length>=60} onClick={()=>galleryRows(items=>[...items,{id:`gallery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,visible:true,image:"",alt:"Describe this photo",caption:"New gallery photo",category:"Journeys"}])}>Add gallery photo</button>}
    {!fields.length&&!rows.length&&<p className="website-manager-note">No matching content in this section.</p>}
  </div>;
}

