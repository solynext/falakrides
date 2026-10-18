"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";

import PublicWebsiteEditor from "./public-website-editor";
import ContentImageField from "./content-image-field";
import {websiteChanges, websiteSummary} from "@/features/content/website-model";
import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import Icon from "@/components/ui/icon";
import {editableContentFields as contentFields} from "@/features/content/fields";
import {contentPages} from "@/features/content/page-navigation";
import {changedFields, fieldValue} from "@/features/content/editor-utils";
import {validateValues} from "@/features/content/validation";
import type {ContentDocument, ContentValues} from "@/features/content/types";

const sectionNames: Record<string, string> = {home: "Header & hero", main: "Homepage content", "whatsapp-title": "WhatsApp identity", "whatsapp-chat": "WhatsApp chat", "whatsapp-description": "WhatsApp description", services: "Services", fleet: "Fleet", routes: "Routes", umrah: "Umrah & Ziyarat", about: "About & benefits", offers: "Offers", faq: "FAQs", contact: "Contact banner", footer: "Footer", inquiry: "Inquiry form", booking: "Booking form", whatsapp: "WhatsApp popup", privacy: "Privacy policy", terms: "Terms & conditions"};
const sectionName = (section: string) => sectionNames[section] || section;

export default function ContentWorkspace({document, values, onChange, onSave, state, actionsTarget}: {
  document: ContentDocument; values: ContentValues; onChange: (values: ContentValues) => void;
  onSave: (publish: boolean) => Promise<void>;
  state: string; actionsTarget: HTMLDivElement | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const main = window.document.getElementById("admin-main");
    if (!main) return;
    const update = () => setScrolled(main.scrollTop > 20);
    const frame = requestAnimationFrame(update);
    main.addEventListener("scroll", update, {passive: true});
    return () => {cancelAnimationFrame(frame); main.removeEventListener("scroll", update);};
  }, []);
  const [pageId, setPageId] = useState(contentPages[0].id);
  const [sectionId, setSectionId] = useState(contentPages[0].sections[0].id);
  const page = contentPages.find(item => item.id === pageId) || contentPages[0];
  const section = page.sections.find(item => item.id === sectionId) || page.sections[0];
  const [validationError, setValidationError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const review = useRef<HTMLDialogElement>(null);
  const reviewTrigger = useRef<HTMLButtonElement>(null);
  const busy = state !== "ready";
  const unsaved = changedFields(values, document.draft);
  const changes = changedFields(values, document.published);
  const dirty = unsaved.length > 0;
  const selectedFields = contentFields.filter(field => section.fields.includes(field.id));

  function update(next: ContentValues) {
    setValidationError(""); onChange(next);
  }
  function validDraft() {
    try { validateValues(values); setValidationError(""); return true; }
    catch (error) {setValidationError(error instanceof Error ? error.message : "Check your content fields before saving."); return false;}
  }
  return <div className="cms-workspace">
    {validationError && <p className="adm-cms-error" role="alert">{validationError} Check fields on other pages and sections, before saving.</p>}
    {actionsTarget && createPortal(
      <div className="cms-primary-actions">{!scrolled && <button className="adm-button secondary" form="cms-editor-form" type="submit" disabled={busy || !dirty}>{state === "saving" ? "Saving..." : "Save draft"}</button>}<button ref={reviewTrigger} className="adm-button" disabled={busy || !changes.length} onClick={() => {if (form.current?.reportValidity() && validDraft()) review.current?.showModal();}}><Icon name="check" size={16}/>Review &amp; publish</button></div>
    , actionsTarget)}
    <nav className="cms-page-tabs" aria-label="Website pages">{contentPages.map(item => <button type="button" key={item.id} aria-current={pageId === item.id ? "page" : undefined} className={pageId === item.id ? "active" : ""} onClick={() => {setPageId(item.id); setSectionId(item.sections[0].id);}}>{item.label}</button>)}</nav>
    <div className="cms-editor-layout">
      <aside className="cms-section-nav"><div className="cms-section-heading">{page.label.toUpperCase()} SECTIONS</div><nav aria-label={page.label + " content sections"}>{page.sections.map(item => <button type="button" key={item.id} className={section.id === item.id ? "active" : ""} aria-current={section.id === item.id ? "page" : undefined} onClick={() => {setSectionId(item.id);}}>{item.label}</button>)}</nav></aside>
      <div className="cms-editor-main">
        <form id="cms-editor-form" ref={form} onSubmit={event => {event.preventDefault(); if (dirty && !busy && validDraft()) void onSave(false);}}><fieldset className="cms-field-list" disabled={busy}>
          {(section.copy.length > 0 || section.collection) && <PublicWebsiteEditor values={values} onChange={update} disabled={busy} section={section} query=""/>}
          {selectedFields.map(field => {
            const value = fieldValue(field, values);
            const inputId = `cms-${field.id}`;
            const longText = !field.kind && field.value.length > 100;
            return <article className="cms-field-card" key={field.id}>
              <small className="cms-field-section">{sectionName(field.section)}</small>
              <label htmlFor={inputId}>{field.label}</label>
              {field.kind === "image" ? <ContentImageField id={inputId} value={value} disabled={busy} onChange={value=>update({...values,[field.id]:value})}/> : longText ? <textarea id={inputId} rows={4} maxLength={6000} value={value} onChange={event => update({...values, [field.id]: event.target.value})}/> : <input id={inputId} type={field.kind === "number" ? "number" : field.kind === "email" ? "email" : field.kind === "phone" ? "tel" : "text"} required={!!field.kind} min={field.kind === "number" ? 0 : undefined} max={field.kind === "number" ? 30 : undefined} step={field.kind === "number" ? 1 : undefined} pattern={field.kind === "phone" ? "[+]?[0-9 ()\\-]{8,25}" : undefined} maxLength={6000} value={value} onChange={event => update({...values, [field.id]: event.target.value})}/>}
            </article>;
          })}
        </fieldset></form>
        {!selectedFields.length && !section.copy.length && !section.collection && <div className="cms-no-results"><p>No editable fields in this section.</p></div>}
      </div>
    </div>
    <dialog ref={review} className="cms-review-dialog" aria-labelledby="cms-review-title" onClose={() => reviewTrigger.current?.focus()} onClick={event => {if (isDialogBackdropClick(event)) review.current?.close();}}>
      <div className="cms-review-head"><div><span className="adm-overline">READY TO GO LIVE</span><h2 id="cms-review-title">Review your changes</h2><p>{changes.length} {changes.length === 1 ? "field" : "fields"} will update on your website.</p></div><button className="adm-icon-button" aria-label="Close publish review" onClick={() => review.current?.close()} autoFocus><ToolIcon name="close"/></button></div>
      <div className="cms-review-list">{changes.map(field => <article key={field.id}><small>{sectionName(field.section)}</small><h3>{field.label}</h3>{field.kind === "website" && <ul className="website-change-list">{websiteChanges(fieldValue(field, document.published),fieldValue(field, values)).map((change,index)=><li key={index}>{change}</li>)}</ul>}<div className="cms-diff"><div><span>Live now</span><p>{(field.kind === "website" ? websiteSummary(fieldValue(field, document.published)) : fieldValue(field, document.published)) || "(Empty)"}</p></div><div><span>After publishing</span><p>{(field.kind === "website" ? websiteSummary(fieldValue(field, values)) : fieldValue(field, values)) || "(Empty)"}</p></div></div></article>)}</div>
      <div className="cms-review-actions"><p>Publishing also saves your current draft.</p><button className="adm-button secondary" disabled={busy} onClick={() => review.current?.close()}>Keep editing</button><button className="adm-button" disabled={busy || !changes.length} onClick={() => {review.current?.close(); void onSave(true);}}><Icon name="check" size={16}/>Publish changes</button></div>
    </dialog>
  </div>;
}

function ToolIcon({name}: {name: "search" | "close"}) {
  const paths = {search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>, close: <path d="m6 6 12 12M6 18 18 6"/>};
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
