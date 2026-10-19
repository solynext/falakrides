"use client";
import {useEffect, useRef, useState} from "react";
import Image from "next/image";
import {photo} from "@/utils/images";
import {isSafePublicImage} from "@/features/content/website-model";
import {MAX_CONTENT_IMAGE_BYTES} from "@/features/content/image-upload";

export default function ContentImageField({value,onChange,disabled=false,id,resource="content",onBusyChange}:{value:string;onChange:(value:string)=>void;disabled?:boolean;id?:string;resource?:"content"|"vehicles"|"locations"|"offers";onBusyChange?:(busy:boolean)=>void}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const latestChange = useRef(onChange);
  useEffect(()=>{latestChange.current=onChange;},[onChange]);
  async function upload(file?:File) {
    if (!file || busy || disabled) return;
    if (file.size > MAX_CONTENT_IMAGE_BYTES) {setError("Choose an image smaller than 8 MB.");return;}
    setBusy(true);onBusyChange?.(true);setError("");
    try {
      const response=await fetch(resource === "content" ? "/api/content/images" : `/api/content/images?resource=${resource}`,{method:"POST",headers:{"Content-Type":file.type},body:file});
      const result=await response.json();if(!response.ok)throw Error(result.error || "Image upload failed.");
      latestChange.current(result.url);
    } catch(error) {setError(error instanceof Error?error.message:"Unable to upload image.");}
    finally {setBusy(false);onBusyChange?.(false);if(input.current)input.current.value="";}
  }
  return <span className="content-image-field">
    {resource === "content" && <input id={id} aria-label="Image URL" value={value} maxLength={2000} disabled={disabled||busy} onChange={event=>onChange(event.target.value)}/>}
    <input hidden ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={disabled||busy} onChange={event=>{void upload(event.target.files?.[0]);}} aria-label="Upload image to Cloudinary"/>
    <span className="content-image-upload-row"><button type="button" className="content-image-upload-button" disabled={disabled||busy} onClick={()=>input.current?.click()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></svg>{busy ? "Uploading..." : resource !== "content" ? "Upload image" : "Choose file"}</button>{resource === "content" && <small>JPG, PNG, WebP, GIF or AVIF ? Up to 8 MB</small>}</span>
    {busy&&<span role="status">Uploading image…</span>}{error&&<span role="alert">{error}</span>}
    {resource === "content" && <small>Upload to Cloudinary or use an image URL. Save draft to store your selection; publish to show it on the website.</small>}
    {value ? <span className="content-image-preview">{isSafePublicImage(value)&&<Image src={photo(value,480)} alt="Selected website image" width={360} height={180} style={{objectFit:resource !== "content" ? "cover" : "contain",maxWidth:"100%",height:resource !== "content" ? "100%" : "auto"}}/>}<button type="button" className="content-image-remove app-x-button" aria-label="Remove image" title="Remove image" disabled={disabled||busy} onClick={()=>{setError("");onChange("");if(input.current)input.current.value="";}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></span> : resource === "content" ? <small>No image selected.</small> : null}
  </span>;
}
