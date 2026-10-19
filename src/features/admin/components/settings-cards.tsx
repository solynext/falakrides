"use client";
import {useEffect, useRef, type ReactNode} from "react";
import Icon from "@/components/ui/icon";
import {isDialogBackdropClick} from "@/lib/dialog-events";
import "./settings-cards.css";

export type SettingsPanel = "company" | "security";
export type CompanyValues = {name: string; phone: string; email: string; currency: string; timezone: string; description: string; version: number};

export default function SettingsCards({onOpen}: {onOpen: (panel: SettingsPanel) => void}) {
  return <div className="adm-settings-cards" role="list">
    {([{id: "company", title: "Company information", description: "Manage your business name, contact details and description.", icon: "file"}, {id: "security", title: "Password & security", description: "Update your administrator password and keep your account secure.", icon: "shield"}] as const).map(item => <div role="listitem" key={item.id}>
      <button type="button" className="adm-settings-card" aria-haspopup="dialog" onClick={() => onOpen(item.id)}>
        <span className="adm-settings-card-icon"><Icon name={item.icon} size={23}/></span>
        <span className="adm-settings-card-copy"><strong>{item.title}</strong><span>{item.description}</span></span>
        <svg className="adm-settings-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </button>
    </div>)}
  </div>;
}

export function SettingsDialog({title, description, busy, onClose, children}: {title: string; description: string; busy: boolean; onClose: () => void; children: ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; element?.showModal();
    return () => {element?.close(); document.body.style.overflow = overflow; previous?.focus();};
  }, []);
  return <dialog ref={dialog} className="adm-dialog adm-settings-popup" aria-labelledby="settings-dialog-title" aria-describedby="settings-dialog-description" onCancel={event => {event.preventDefault(); if (!busy) onClose();}} onClick={event => {if (!busy && isDialogBackdropClick(event)) onClose();}}>
    <header className="adm-settings-popup-header"><div><h2 id="settings-dialog-title">{title}</h2><p id="settings-dialog-description">{description}</p></div><button type="button" className="adm-icon-button app-x-button" disabled={busy} onClick={onClose} aria-label="Close settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    {children}
  </dialog>;
}

export function CompanySettings({values, onChange, onSubmit, busy}: {values: CompanyValues; onChange: (patch: Partial<CompanyValues>) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; busy: boolean}) {
  const fields = [{key: "name", label: "Business name"}, {key: "phone", label: "Contact number"}, {key: "email", label: "Email address"}, {key: "currency", label: "Currency"}, {key: "timezone", label: "Timezone"}, {key: "description", label: "Description"}] as const;
  return <div className="adm-settings"><form onSubmit={onSubmit}><fieldset className="adm-dialog-fields" disabled={busy}>
    {fields.map(({key, label}) => <label key={key} className={key === "description" ? "wide" : ""}>{label}{key === "description" ? <textarea value={values[key]} maxLength={600} rows={3} onChange={event => onChange({[key]: event.target.value})}/> : <input required type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={values[key]} readOnly={key === "currency" || key === "timezone"} onChange={event => onChange({[key]: event.target.value})}/>}</label>)}
  </fieldset><div className="adm-settings-footer"><p>Saved business details update the public website.</p><button className="adm-button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save settings"}</button></div></form></div>;
}
