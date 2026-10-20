"use client";

import Image from "next/image";
import {useEffect, useMemo, useRef, useState} from "react";
import {photo} from "@/utils/images";
import type {WebsiteData, WebsiteGalleryPhoto} from "@/features/content/website-model";
import "./gallery.css";

type GalleryCopy=WebsiteData["copy"];
export default function GalleryExperience({photos,copy}:{photos:WebsiteGalleryPhoto[];copy:GalleryCopy}) {
  const [category,setCategory]=useState("all");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const categories=useMemo(()=>Array.from(new Set(photos.map(item=>item.category.trim()).filter(Boolean))),[photos]);
  const visible=useMemo(()=>photos.filter(item=>(category==="all"||item.category===category)&&`${item.caption} ${item.category} ${item.alt}`.toLowerCase().includes(query.trim().toLowerCase())),[photos,category,query]);
  const activeIndex=visible.findIndex(item=>item.id===selected);
  const active=activeIndex>=0?visible[activeIndex]:null;
  useEffect(()=>{
    const element=dialog.current;
    if(!element)return;
    if(active&&!element.open)element.showModal();
    if(!active&&element.open)element.close();
  },[active]);
  function move(step:number){if(!visible.length)return;setSelected(visible[(Math.max(0,activeIndex)+step+visible.length)%visible.length].id);}
  return <section className="gallery-experience" aria-label="Travel photo gallery">
    <div className="gallery-heading-row"><div><span className="gallery-eyebrow">{copy.galleryEyebrow}</span><h2>{copy.galleryHeading}</h2></div><p>{visible.length} {visible.length===1?copy.galleryPhotoSingular:copy.galleryPhotoPlural}</p></div>
    <div className="gallery-toolbar">
      <div className="gallery-filters" aria-label="Filter gallery by category">
        <button type="button" className={category==="all"?"active":""} aria-pressed={category==="all"} onClick={()=>setCategory("all")}>{copy.galleryAll}<span>{photos.length}</span></button>
        {categories.map(name=><button type="button" className={category===name?"active":""} aria-pressed={category===name} key={name} onClick={()=>setCategory(name)}>{name}<span>{photos.filter(item=>item.category===name).length}</span></button>)}
      </div>
      <label className="gallery-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><span className="gallery-visually-hidden">Search photos</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy.gallerySearchPlaceholder}/></label>
    </div>
    {visible.length?<div className="gallery-grid">{visible.map((item,index)=><button type="button" className={`gallery-card gallery-card-${index%6}`} key={item.id} onClick={()=>setSelected(item.id)} aria-label={`View ${item.caption}`}>
      <span className="gallery-card-image"><Image src={photo(item.image,1200)} alt={item.alt} fill sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw" priority={index<2}/></span>
      <span className="gallery-card-shade"/><span className="gallery-card-copy"><span>{item.category}</span><strong>{item.caption}</strong></span><span className="gallery-card-open" aria-hidden="true">↗</span>
    </button>)}</div>:<div className="gallery-empty"><span>✳</span><h3>{photos.length?copy.galleryNoResultsTitle:copy.galleryEmptyTitle}</h3><p>{photos.length?copy.galleryNoResults:copy.galleryEmpty}</p>{(query||category!=="all")&&<button type="button" onClick={()=>{setCategory("all");setQuery("");}}>{copy.galleryClear}</button>}</div>}
    <dialog ref={dialog} className="gallery-lightbox" aria-label="Photo viewer" onClose={()=>setSelected(null)} onKeyDown={event=>{if(event.key==="ArrowRight"){event.preventDefault();move(1);}if(event.key==="ArrowLeft"){event.preventDefault();move(-1);}}} onClick={event=>{if(event.target===dialog.current)dialog.current?.close();}}>
      {active&&<div className="gallery-lightbox-content"><button type="button" className="gallery-lightbox-close" onClick={()=>dialog.current?.close()} aria-label="Close photo viewer">×</button><button type="button" className="gallery-lightbox-arrow previous" onClick={()=>move(-1)} aria-label="Previous photo">‹</button><div className="gallery-lightbox-image"><Image src={photo(active.image,1800)} alt={active.alt} fill sizes="90vw"/></div><button type="button" className="gallery-lightbox-arrow next" onClick={()=>move(1)} aria-label="Next photo">›</button><div className="gallery-lightbox-caption"><span>{active.category} · {activeIndex+1} / {visible.length}</span><h2>{active.caption}</h2><p>{active.alt}</p></div></div>}
    </dialog>
  </section>;
}
