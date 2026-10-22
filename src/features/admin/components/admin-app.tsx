"use client";

import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {isDialogBackdropClick} from "@/lib/dialog-events";

import BrandLogo from "@/components/ui/brand-logo";
import {Fragment, useEffect, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {usePathname} from "next/navigation";
import {adminSectionFromPath, adminSectionPath} from "../routes";
import NotificationCenter from "./notification-center";
import AdminProfile from "./admin-profile";
import PasswordSettings from "./password-settings";
import SettingsCards, {SettingsDialog, CompanySettings, type SettingsPanel} from "./settings-cards";
import ExportDialog from "./export-dialog";
import CustomerImport from "./customer-import";
import ContentImageField from "./content-image-field";
import LocationServicesField, {selectedServiceIds} from "./location-services-field";
import SavedRecordSelect from "./saved-record-select";
import {applySavedRide,applySavedCustomer,applyBookingLink,routeStops} from "../record-links";
import VehicleCategoryField from "./vehicle-category-field";
import {bookingStatusMessage} from "@/features/bookings/status-message";
import type {ExportData} from "../exports";
import WebsiteContent from "./website-content";
import ServicesManager from "./services-manager";
import Icon from "@/components/ui/icon";
import {useUnsavedChanges, useConfirmNavigation} from "@/components/forms/unsaved-changes";
import {initialSettings, modules} from "../data/modules";
import type {AdminRow, Module} from "../types";
import {bookingGradient, bookingStatuses} from "../utils";
import {api} from "@/lib/api-client";
import {revenueSeries} from "../revenue";
import {photo} from "@/utils/images";
import {canAccess} from "@/features/auth/permissions";

const currency = (value: string | number) => `SAR ${Number(value || 0).toLocaleString("en-US", {maximumFractionDigits: 2})}`;
const groups = [
  {label:"WORKSPACE",items:[["overview","Dashboard","grid"],["bookings","Bookings","calendar"],["services","Our Services","window"],["locations","Locations","pin"],["customers","Customers","users"]]},
  {label:"OPERATIONS",items:[["drivers","Drivers","driver"],["vehicles","Vehicles","vehicle"],["fares","Price and Routes","route"]]},
  {label:"BUSINESS",items:[["offers","Offers & packages","ticket"],["payments","Payments","wallet"],["feedback","Reviews & feedback","message"]]},
  {label:"MANAGEMENT",items:[["content","Website content","window"],["reports","Reports","chart"],["roles","Team & roles","access"],["settings","Settings","sliders"]]},
];
function AdminIcon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,React.ReactNode>={grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,chart:<><path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/></>,settings:<><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,download:<><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></>,search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,plus:<path d="M12 5v14M5 12h14"/>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,close:<path d="m6 6 12 12M6 18 18 6"/>};
  Object.assign(paths, {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/></>,
    driver: <><circle cx="12" cy="7" r="3"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/><circle cx="12" cy="18" r="3"/><path d="M9 18h6m-3 0v3"/></>,
    vehicle: <><path d="m5 10 2-6h10l2 6M5 10h14a2 2 0 0 1 2 2v6H3v-6a2 2 0 0 1 2-2Zm0 8v3m14-3v3M7 14h1m8 0h1"/></>,
    route: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M9 5h7a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></>,
    ticket: <><path d="M3 8V5h18v3a4 4 0 0 0 0 8v3H3v-3a4 4 0 0 0 0-8Zm12-3v2m0 4v2m0 4v2"/></>,
    wallet: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18m0 4h-6v4h6M7 5V3h11"/></>,
    message: <><path d="M21 14a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7ZM7 8h10M7 12h6"/></>,
    window: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M7 6h.01m3 0h.01"/></>,
    access: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    sliders: <><path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></>,
  });
  return paths[name] ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> : <Icon name={name} size={size}/>;
}
function Badge({value}:{value:string}) {
  const tone=["Completed","Available","Paid","Active","Approved","Resolved","Published"].includes(value)?"green":["Confirmed","Scheduled","On a ride","Queued"].includes(value)?"blue":["Pending","Invited","Maintenance"].includes(value)?"amber":["Cancelled","Rejected","Disabled"].includes(value)?"red":value==="Refunded"?"purple":"gray";
  return <span className={`adm-badge ${tone}`}><i/>{value}</span>;
}

function RecordDialog({moduleKey,record,definition,drivers,vehicles,locations,serviceCategories,bookings,customers,fares,onClose,onSave,onDelete,onAction,editable,canCreateCategories=false,onBookingUpdated}:{moduleKey:string;record:AdminRow;definition:Module;drivers:AdminRow[];vehicles:AdminRow[];locations:AdminRow[];serviceCategories:AdminRow[];bookings:AdminRow[];customers:AdminRow[];fares:AdminRow[];onClose:()=>void;onSave:(row:AdminRow)=>Promise<void>;onDelete:()=>Promise<void>;onAction:(row:AdminRow,message:string)=>Promise<void>;editable:boolean;canCreateCategories?:boolean;onBookingUpdated:(row:AdminRow)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const form=useRef<HTMLFormElement>(null);
  const [draft,setDraft]=useState({...record});
  const locationOptions=locations.filter(location=>location.status === "Active").map(location=>({value:location.name,label:location.name}));
  const vehicleOptions=vehicles.map(vehicle=>({value:vehicle.id,label:`${vehicle.name} · ${vehicle.plate}`,disabled:vehicle.status === "Maintenance" && vehicle.id !== draft.vehicle && vehicle.id !== draft.vehicleId}));
  function changeLocation(key:string,value:string) {
    setDraft(current=>{
      const next={...current,[key]:value};
      if(moduleKey !== "bookings")return next;
      const fare=fares.find(fare=>fare.status === "Active" && (!fare.vehicleId || !current.vehicle || current.vehicle === "Unassigned" || fare.vehicleId === current.vehicle) && routeStops(fare.route).join("→") === [next.pickup,next.destination].join("→"));
      return {...next,fareId:fare?.id || "",fare:fare?.fare || "",...(fare?.vehicleId ? {vehicle:fare.vehicleId} : {})};
    });
  }
  const [requestError, setRequestError] = useState("");
  const [working, setWorking] = useState(false);
  const [deliveryMessage,setDeliveryMessage] = useState("");
  const [whatsappUrl,setWhatsappUrl] = useState("");
  async function sendBookingUpdate(channel:"Email"|"WhatsApp") {
    if(working || !editable || !form.current?.reportValidity())return;
    const popup=channel === "WhatsApp" ? window.open("about:blank","_blank") : null;
    if(popup)popup.opener=null;
    setWorking(true);setRequestError("");setDeliveryMessage("");setWhatsappUrl("");
    try {
      const result=await api<{row:AdminRow;sent?:boolean;sentTo?:string;whatsappUrl?:string;deliveryError?:string}>(`/api/admin/bookings/${encodeURIComponent(record.id)}/notify`,{method:"POST",body:JSON.stringify({channel,row:draft})});
      setDraft({...result.row});onBookingUpdated(result.row);
      if(result.deliveryError){popup?.close();setRequestError(`Booking saved. ${result.deliveryError}`);return;}
      if(result.whatsappUrl){setWhatsappUrl(result.whatsappUrl);if(popup)popup.location.href=result.whatsappUrl;setDeliveryMessage("Booking saved. Send the prepared message in WhatsApp.");}
      else {popup?.close();setDeliveryMessage("Sent");}
    } catch(error) {popup?.close();setRequestError(error instanceof Error ? error.message : "Unable to send booking update.");}
    finally {setWorking(false);}
  }
  async function perform(action: () => Promise<void>) {if (working || !editable) return; setWorking(true); setRequestError(""); try {await action();} catch (error) {setRequestError(error instanceof Error ? error.message : "Unable to save. Please try again.");} finally {setWorking(false);}}
  useUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(record), () => setDraft({...record}));
  const closeEditor = () => {if (!working) onClose();};
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [receipt,setReceipt]=useState(false);
  useEffect(()=>{const element=dialog.current;if(element && !element.open) element.showModal();return ()=>element?.close();},[]);
  const action=(status:string,message:string)=>{if(form.current?.reportValidity()) void perform(() => onAction({...draft,status},message));};
  return <dialog ref={dialog} className={`adm-dialog ${moduleKey === "vehicles" ? "adm-vehicle-dialog" : moduleKey === "bookings" ? "adm-booking-dialog" : ["locations","offers"].includes(moduleKey) ? "adm-location-dialog" : ""}`} aria-labelledby="admin-dialog-title" onCancel={event => {event.preventDefault(); closeEditor();}} onClick={event=>{if(isDialogBackdropClick(event))closeEditor();}}>
    <div className="adm-dialog-top"><div>{moduleKey === "vehicles" && draft.plate && <span className="adm-overline">Vehicle number: {draft.plate}</span>}<h2 id="admin-dialog-title">{receipt?"Receipt preview":record.id.startsWith("NEW")?`Add ${definition.singular}`:`Manage ${definition.singular}`}</h2></div>{moduleKey === "bookings" && !record.id.startsWith("NEW") && <div className="adm-booking-message-actions" role="group" aria-label="Send booking update"><button type="button" className="adm-button secondary adm-booking-email" disabled={working || !editable || !draft.email?.trim()} onClick={() => {void sendBookingUpdate("Email");}}><Icon name="mail" size={17}/>Email</button><button type="button" className="adm-button secondary adm-booking-whatsapp" disabled={working || !editable || !draft.phone?.trim()} onClick={() => {void sendBookingUpdate("WhatsApp");}}><Icon name="chat" size={17}/>WhatsApp</button></div>}<button className="adm-icon-button app-x-button" onClick={closeEditor} aria-label="Close dialog"><AdminIcon name="close"/></button></div>
    {receipt?<div className="adm-receipt"><span className="adm-badge amber">PAYMENT RECORD</span><h3>Falak Rides</h3><p>{draft.customer} · {draft.booking}</p><strong>{currency(draft.amount)}</strong><p>{draft.method} · {draft.status}</p><button className="adm-button secondary" onClick={()=>setReceipt(false)}>Back to payment</button></div>:<form ref={form} onSubmit={event=>{event.preventDefault();void perform(() => onSave(draft));}}>
      {moduleKey === "bookings" && !record.id.startsWith("NEW") && <section className="adm-booking-message" aria-label="Send booking update">
        <div className="adm-booking-message-heading"><div className="adm-message-title"><span className="adm-message-icon"><Icon name="mail" size={20}/></span><div><h3>Send booking update</h3><p>Uses the selected status and saves your changes.</p></div></div><Badge value={draft.status || "Pending"}/></div>
        <div className="adm-booking-recipient"><span className="adm-recipient-avatar" aria-hidden="true">{(draft.customer || "Customer").split(" ").filter(Boolean).map(part => part[0]).slice(0,2).join("")}</span><div><span className="adm-recipient-label">EMAIL RECIPIENT</span><strong>{draft.customer || "Customer"}</strong><span className="adm-recipient-email">{draft.email || "Add a customer email address"}</span></div><Icon name="mail" size={18}/></div>

        <details><summary><span><Icon name="file" size={16}/>Preview message</span><span className="adm-preview-chevron" aria-hidden="true">⌄</span></summary><pre>{bookingStatusMessage({reference:record.id,customerName:draft.customer,pickup:draft.pickup,destination:draft.destination,date:draft.date,time:draft.time,dropoffDate:draft.dropoffDate,dropoffTime:draft.dropoffTime,status:draft.status,passengers:draft.passengers,vehicleName:vehicles.find(vehicle => vehicle.id === draft.vehicle)?.name || draft._vehicleName,fare:draft.fare ? Number(draft.fare)*100 : null})}</pre></details>
        {deliveryMessage && <div className="adm-message-success" role="status"><Icon name="check" size={18}/><span>{deliveryMessage}</span></div>}{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Open WhatsApp message <span aria-hidden="true">↗</span></a>}
      </section>}
      {["bookings","offers"].includes(moduleKey) && <datalist id="adm-location-options">{locations.filter(location => location.status !== "Inactive" && location.status !== "Draft").map(location => <option key={location.id} value={location.name}/>)}</datalist>}
      {moduleKey==="payments"&&<div className="adm-quick-actions"><button type="button" onClick={()=>setReceipt(true)}>Preview receipt</button><button type="button" onClick={()=>action("Refunded","Refund recorded.")}>Record refund</button></div>}
      {moduleKey==="notifications"&&<div className="adm-quick-actions"><button type="button" onClick={()=>action("Draft","send")}>Send notification</button><span>Delivery requires a configured provider.</span></div>}
      {requestError && <p role="alert" className="adm-account-error">{requestError}</p>}<div className="adm-dialog-fields">{(moduleKey === "vehicles" ? ["name","plate","category","status","passengers","luggage","description","image"].flatMap(key => definition.fields.filter(field => field.key === key)) : definition.fields).map(field=>{
        if(moduleKey === "bookings" && field.key === "customer") return <div key={field.key} className="wide adm-linked-customer"><label>Customer<SavedRecordSelect value={draft.customerId || ""} options={customers.map(customer=>({value:customer.id,label:`${customer.name} · ${customer.email || customer.phone}`}))} placeholder="Add new customer" disabled={!editable || working} onChange={id=>setDraft(current=>applySavedCustomer(current,customers.find(customer=>customer.id===id)))}/></label><label>Customer name<input value={draft.customer || ""} required readOnly={!!draft.customerId} disabled={!editable || working} maxLength={200} onChange={event=>setDraft(current=>({...current,customer:event.target.value}))}/></label></div>;
        if(["payments","notifications"].includes(moduleKey) && field.key === "booking")return <label key={field.key}>Booking<SavedRecordSelect value={draft.booking || ""} options={bookings.map(booking=>({value:booking.id,label:`${booking.id} · ${booking.customer} · ${booking.route}`}))} required={moduleKey === "payments"} placeholder={moduleKey === "payments" ? "Select saved booking" : "No booking"} disabled={!editable || working} onChange={reference=>setDraft(current=>applyBookingLink(current,bookings.find(booking=>booking.id===reference),moduleKey))}/></label>;
        if(moduleKey === "payments" && field.key === "customer")return <label key={field.key}>Customer<input readOnly value={bookings.find(booking=>booking.id===draft.booking)?.customer || draft.customer || ""}/></label>;
        if(moduleKey === "notifications" && field.key === "recipient")return <label key={field.key}>Recipient<input required readOnly={!!draft.booking} disabled={!editable || working} value={draft.recipient || ""} onChange={event=>setDraft(current=>({...current,recipient:event.target.value}))}/></label>;
        if(moduleKey === "notifications" && field.key === "channel")return <label key={field.key}>Channel<select disabled={!editable || working} value={draft.channel || "WhatsApp"} onChange={event=>setDraft(current=>{const next={...current,channel:event.target.value};const booking=bookings.find(booking=>booking.id===current.booking);return booking ? {...next,recipient:event.target.value === "Email" ? booking.email : booking.phone} : next;})}>{field.options?.map(option=><option key={option}>{option}</option>)}</select></label>;
        if(moduleKey === "fares" && field.key === "vehicleId")return <label key={field.key}>{field.label}<SavedRecordSelect required value={draft.vehicleId || ""} options={vehicleOptions} placeholder="Select saved ride" disabled={!editable || working} onChange={vehicleId=>setDraft(current=>({...current,vehicleId}))}/></label>;
        if(moduleKey === "drivers" && field.key === "vehicle")return <label key={field.key}>Vehicle<SavedRecordSelect value={vehicles.find(vehicle=>vehicle.id===draft.vehicle || vehicle.name===draft.vehicle)?.id || draft.vehicle || ""} options={vehicleOptions} placeholder="Unassigned" disabled={!editable || working} onChange={vehicle=>setDraft(current=>({...current,vehicle}))}/></label>;
        if(moduleKey === "drivers" && field.key === "city" || moduleKey === "fares" && ["pickup","destination"].includes(field.key))return <label key={field.key}>{field.label}<SavedRecordSelect value={draft[field.key] || ""} options={locationOptions} required placeholder="Select saved location" disabled={!editable || working} onChange={value=>changeLocation(field.key,value)}/></label>;
        if (moduleKey === "bookings" && ["date","time","dropoffDate","dropoffTime"].includes(field.key)) return null;
        if (moduleKey === "bookings" && ["pickup","destination"].includes(field.key)) {
          const pickup = field.key === "pickup";
          const dateKey = pickup ? "date" : "dropoffDate", timeKey = pickup ? "time" : "dropoffTime";
          const required = pickup || record.id.startsWith("NEW") || !!draft.dropoffDate || !!draft.dropoffTime;
          return <Fragment key={field.key}>{pickup && <label className="wide">Ride / fare route<SavedRecordSelect value={draft.fareId || fares.find(fare=>fare.status === "Active" && routeStops(fare.route).join("→") === [draft.pickup,draft.destination].join("→"))?.id || ""} options={fares.filter(fare=>fare.status === "Active").map(fare=>({value:fare.id,label:`${fare.route} · ${fare.priceRange || (fare.fare ? currency(fare.fare) : "Quote required")}`}))} placeholder="Select a saved ride or choose locations below" disabled={!editable || working} onChange={id=>setDraft(current=>applySavedRide(current,fares.find(fare=>fare.id===id)))}/></label>}<fieldset className={`adm-booking-leg ${pickup ? "pickup" : "dropoff"}`} disabled={!editable || working}>
            <legend><span className="adm-leg-marker" aria-hidden="true">{pickup ? "1" : "2"}</span>{pickup ? "Pickup" : "Drop-off"}</legend>
            <label className="adm-booking-location" htmlFor={`adm-${field.key}`}><span>{pickup ? "Pickup location" : "Drop-off location"}</span><span className="adm-location-input"><Icon name="pin" size={18}/><SavedRecordSelect id={`adm-${field.key}`} value={draft[field.key] || ""} options={locationOptions} required placeholder="Select saved location" onChange={value=>changeLocation(field.key,value)}/></span></label>
            <label htmlFor={`adm-${dateKey}`}><span className="adm-leg-label"><Icon name="calendar" size={14}/>Date <small>KSA</small></span><input id={`adm-${dateKey}`} type="date" required={required} value={draft[dateKey] || ""} min={pickup ? undefined : draft.date || undefined} onChange={event => setDraft(current => ({...current,[dateKey]:event.target.value}))}/></label>
            <label htmlFor={`adm-${timeKey}`}><span className="adm-leg-label"><Icon name="clock" size={14}/>Time <small>KSA</small></span><input id={`adm-${timeKey}`} type="time" required={required} value={draft[timeKey] || ""} onChange={event => setDraft(current => ({...current,[timeKey]:event.target.value}))}/></label>
          </fieldset></Fragment>;
        }
        if (moduleKey === "offers") {
          if(field.key === "image") {const vehicle=vehicles.find(vehicle=>vehicle.id===draft.vehicleId);return <div key={field.key} className="wide adm-offer-vehicle-image"><span>Vehicle image</span>{vehicle?.image ? <Image src={photo(vehicle.image,640)} alt={vehicle.name} width={320} height={160} style={{objectFit:"cover",maxWidth:"100%",borderRadius:10}}/> : <small>{vehicle ? "Add an image in Vehicles." : "Select a vehicle to preview its image."}</small>}</div>;}
          if(["vehicleId","pickup","destination"].includes(field.key))return <label key={field.key}>{field.label}{field.key === "vehicleId" ? <SavedRecordSelect required disabled={!editable || working} value={draft.vehicleId || ""} options={vehicleOptions} placeholder="Select saved vehicle" onChange={vehicleId=>{const selected=vehicles.find(vehicle=>vehicle.id===vehicleId);setDraft(current=>({...current,vehicleId,image:selected?.image || ""}));}}/> : <SavedRecordSelect required value={draft[field.key] || ""} options={locationOptions} placeholder="Select saved location" disabled={!editable || working} onChange={value=>changeLocation(field.key,value)}/>}</label>;
        }
        if (moduleKey === "fares" && field.key === "serviceId") return <label key={field.key} htmlFor="adm-fare-service-category">Service<SavedRecordSelect id="adm-fare-service-category" value={draft.serviceId || ""} options={serviceCategories.map(service=>({value:service.id,label:service.name}))} placeholder="Select service" disabled={!editable || working} onChange={serviceId=>setDraft(current=>({...current,serviceId}))}/>{!serviceCategories.length && <small>Add a service in Our Services to select it here.</small>}</label>;
        if (moduleKey === "locations" && field.key === "serviceIds") return <LocationServicesField key={field.key} value={draft.serviceIds || "[]"} services={serviceCategories} disabled={!editable || working} onChange={serviceIds=>setDraft(current=>({...current,serviceIds}))}/>;
        if (moduleKey === "locations" && field.key === "image") return <div key={field.key} className="wide"><ContentImageField id="adm-location-image" value={draft.image || ""} onChange={image => setDraft(current => ({...current,image}))} disabled={!editable || working} resource="locations" onBusyChange={setWorking}/></div>;
        if (moduleKey === "vehicles" && field.key === "image") return <div key={field.key} className="wide"><ContentImageField id="adm-image" value={draft.image || ""} onChange={image => setDraft(current => ({...current,image}))} disabled={!editable || working} resource="vehicles" onBusyChange={setWorking}/></div>;
        if (moduleKey === "vehicles" && field.key === "category") return <VehicleCategoryField key={field.key} value={draft.category || ""} onChange={category => setDraft(current => ({...current,category}))} disabled={!editable || working} canCreate={canCreateCategories} onBusyChange={setWorking} onRename={(from,to,vehicles) => setDraft(current => {const vehicle = vehicles.find(item => item.id === current.id);return {...current,category:current.category === from ? to : current.category,...(vehicle && Number(current._version) === vehicle.version - 1 ? {_version:String(vehicle.version)} : {})};})}/>;
        if (moduleKey === "vehicles") {
          const fieldId = `adm-${field.key}`;
          const disabled = !editable || working;
          const heading = field.key === "name" ? "Vehicle details" : field.key === "passengers" ? "Capacity" : field.key === "description" ? "Additional details" : "";
          const update = (value:string) => setDraft(current => ({...current,[field.key]:value}));
          return <Fragment key={field.key}>
            {heading && <h3 className="adm-vehicle-section">{heading}</h3>}
            <div className={`adm-vehicle-field ${field.type === "textarea" ? "wide" : ""}`}>
            <label htmlFor={fieldId}>{field.label.replace("Public category", "Category").replace("Public description", "Description")}</label>
            <div className="adm-vehicle-input">
              {field.type === "select" ? <select id={fieldId} value={draft[field.key] || ""} required disabled={disabled} onChange={event => update(event.target.value)}><option value="" disabled>Select status</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === "textarea" ? <textarea id={fieldId} value={draft[field.key] || ""} rows={3} maxLength={1500} disabled={disabled} onChange={event => update(event.target.value)}/> : <input id={fieldId} type={field.type || "text"} value={draft[field.key] || ""} required={field.required} min={field.type === "number" ? field.key === "passengers" ? 1 : 0 : undefined} step={field.type === "number" ? 1 : undefined} maxLength={200} disabled={disabled} onChange={event => update(event.target.value)}/>}
            </div>
            </div>
          </Fragment>;
        }
        if(moduleKey === "bookings" && ["driver","vehicle"].includes(field.key)) {
          const isDriver=field.key === "driver";
          const options=isDriver ? drivers.map(driver=>({value:driver.id,label:driver.name,disabled:driver.status === "Off duty"})) : vehicleOptions.map(option=>({...option,disabled:option.disabled || Number(vehicles.find(vehicle=>vehicle.id===option.value)?.passengers || 0)<Number(draft.passengers || 1)}));
          return <label key={field.key}>{field.label}<SavedRecordSelect value={draft[field.key] === "Unassigned" ? "" : draft[field.key] || ""} options={options} placeholder="Unassigned" disabled={!editable || working} onChange={value=>setDraft(current=>{const next={...current,[field.key]:value || "Unassigned"};if(!isDriver)next.fareId="";if(isDriver && value){const driver=drivers.find(driver=>driver.id===value);const vehicle=vehicles.find(vehicle=>vehicle.id===driver?.vehicle || vehicle.name===driver?.vehicle);if(vehicle && vehicle.status !== "Maintenance" && Number(vehicle.passengers)>=Number(current.passengers || 1))next.vehicle=vehicle.id;}return next;})}/></label>;
        }
        if (field.type === "checkbox") return <label key={field.key} className="adm-featured-checkbox"><input type="checkbox" checked={draft[field.key] === "true"} disabled={!editable || working} onChange={event => setDraft({...draft, [field.key]: String(event.target.checked)})}/><span>{field.label}</span></label>;
        let options=field.options;
        if(moduleKey==="bookings"&&field.key==="driver")options=["Unassigned",...drivers.map(row=>row.id)];
        if(moduleKey==="bookings"&&field.key==="vehicle")options=["Unassigned",...vehicles.map(row=>row.id)];
        if(options&&draft[field.key]&&!options.includes(draft[field.key]))options=[draft[field.key],...options];
        if(options)options=Array.from(new Set(options));
        return <label key={field.key} className={field.type==="textarea"?"wide":""}>{field.label}{field.type==="select"?<select disabled={!editable || working} id={`adm-${field.key}`} value={draft[field.key]||options?.[0]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}>{options?.map(option=><option key={option} value={option}>{field.key === "driver" ? drivers.find(row => row.id === option)?.name || option : field.key === "vehicle" ? vehicles.find(row => row.id === option)?.name || option : option}</option>)}</select>:field.type==="textarea"?<textarea disabled={!editable || working} id={`adm-${field.key}`} rows={3} maxLength={1500} value={draft[field.key]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>:<input readOnly={field.key === "trips"} disabled={!editable || working} id={`adm-${field.key}`} required={field.required} type={field.type||"text"} min={field.type==="number"?(field.key==="passengers"?1:0):undefined} max={field.key==="discount"?100:undefined} step={field.type==="number"?(["passengers","luggage","trips","discount"].includes(field.key)?"1":"0.01"):undefined} maxLength={200} value={draft[field.key]||""} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>}</label>;
      })}</div>

      <div className="adm-dialog-note"><Icon name="shield" size={16}/> Changes are saved to your operations workspace.</div>
      {confirmDelete&&<div className="adm-delete-confirm" role="alert">Remove this record? <button type="button" disabled={working || !editable} onClick={() => {void perform(onDelete);}}>Yes, remove</button><button type="button" onClick={()=>setConfirmDelete(false)}>Keep record</button></div>}
      <div className="adm-dialog-footer">{!record.id.startsWith("NEW")&&<button type="button" className="adm-danger" disabled={working || !editable} onClick={()=>setConfirmDelete(true)}>Delete</button>}<div><button type="button" className="adm-button secondary" onClick={closeEditor}>Cancel</button><button className="adm-button" disabled={working || !editable} type="submit">Save changes</button></div></div>
    </form>}
  </dialog>;
}

type Snapshot = {data: Record<string, AdminRow[]>; settings: {name: string; phone: string; email: string; currency: string; timezone: string; description: string; version: number} | null; notices: {noticeId: string; read: boolean; dismissed: boolean}[]; user: {id: string; name: string; role: string}};
export default function AdminApp({initial}: {initial: Snapshot}) {
  const pathname = usePathname();
  const requestedSection = adminSectionFromPath(pathname) || "overview";
  const section = requestedSection === "overview" || canAccess(initial.user.role, requestedSection) ? requestedSection : "overview";
  const [contentActionsTarget,setContentActionsTarget]=useState<HTMLDivElement|null>(null);
  const [servicesActionsTarget,setServicesActionsTarget]=useState<HTMLDivElement|null>(null);
  const [data,setData]=useState(initial.data);
  const [busy, setBusy] = useState(false);
  const [settingsPanel,setSettingsPanel]=useState<SettingsPanel|null>(null);
  const [passwordBusy,setPasswordBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [globalSearch,setGlobalSearch]=useState("");
  const [status,setStatus]=useState("All statuses");
  const [dateFilter,setDateFilter]=useState("All dates");
  const [menu,setMenu]=useState(false);
  useEffect(() => {
    if (!menu || !window.matchMedia("(max-width: 800px)").matches) return;
    const sidebar = document.getElementById("admin-navigation");
    const workArea = document.querySelector<HTMLElement>(".adm-work-area");
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || []);
    const focusTimer = window.setTimeout(() => {
      focusable()[0]?.focus();
      if (workArea) workArea.inert = true;
    }, 210);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {event.preventDefault(); setMenu(false);}
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    };
    const media = window.matchMedia("(max-width: 800px)");
    const resize = () => {if (!media.matches) setMenu(false);};
    media.addEventListener("change", resize);
    document.addEventListener("keydown", keydown);
    return () => {
      clearTimeout(focusTimer);
      if (workArea) workArea.inert = false;
      media.removeEventListener("change", resize);
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [menu]);
  const [loggingOut,setLoggingOut]=useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutError,setLogoutError]=useState("");
  const [editor,setEditor]=useState<{key:string;row:AdminRow;singular?:string}|null>(null);
  const [toast,setToast]=useState("");
  const [customerImport,setCustomerImport]=useState(false);
  const [exportData,setExportData]=useState<ExportData|null>(null);
  const initialCompany = initial.settings || {...initialSettings, version: 0};
  const [settings,setSettings]=useState(initialCompany);
  const [savedSettings, setSavedSettings] = useState(initialCompany);
  useUnsavedChanges(section === "settings" && JSON.stringify(settings) !== JSON.stringify(savedSettings), () => setSettings(savedSettings));
  const confirmNavigation = useConfirmNavigation();
  const today = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"});
  const [reportFrom,setReportFrom]=useState(today.slice(0, 7) + "-01");
  const [reportTo,setReportTo]=useState(today);
  const [chartPeriod,setChartPeriod]=useState("7 days");
  const revenue = revenueSeries(data.payments, chartPeriod === "7 days" ? 7 : 30);
  const heading=section==="overview"?"Dashboard":section==="reports"?"Reports":section==="settings"?"Settings":section==="services"?"Our Services":modules[section]?.title;
  const activeModule=section === "content" || section === "services" ? undefined : modules[section];
  const bookings=data.bookings;
  const pending=bookings.filter(row=>row.status==="Pending").length;
  const paid=data.payments.filter(row=>row.status==="Paid").reduce((sum,row)=>sum+Number(row.amount||0),0);
  const filtered=activeModule?data[section].filter(row=>(status==="All statuses"||row.status===status)&&Object.values(row).some(value=>value.toLowerCase().includes(search.toLowerCase()))&&(section!=="bookings"||dateFilter==="All dates"||row.date===today)):[];
  const reportRows=bookings.filter(row=>(!reportFrom||row.date>=reportFrom)&&(!reportTo||row.date<=reportTo));
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),6000);return ()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(!menu)return;const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenu(false);};document.addEventListener("keydown",key);return ()=>document.removeEventListener("keydown",key);},[menu]);
  function logout() {
    if (loggingOut) return;
    setConfirmLogout(true);
  }
  async function performLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api("/api/auth/sign-out", {method: "POST", body: "{}"});
      window.location.replace("/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }
  function navigate(key:string) {if (key === section && pathname === adminSectionPath(key)) return; confirmNavigation(() => performNavigate(key));}
  function performNavigate(key:string) {document.getElementById("admin-main")?.scrollTo({top:0,left:0,behavior:"instant"});window.history.pushState(null, "", adminSectionPath(key));setSearch("");setStatus("All statuses");setDateFilter("All dates");setMenu(false);}
  async function save(key:string,row:AdminRow,_message?:string) {
    if (busy) return; setBusy(true);
    try {if (key === "payments" && row.status === "Refunded" && row.method === "Card") {await api(`/api/admin/payments/${encodeURIComponent(row.id)}/refund`, {method: "POST", body: JSON.stringify({version: Number(row._version)})}); setEditor(null); setToast("Refund submitted to the payment provider."); return;} const create = row.id === "NEW"; const result = await api<{row: AdminRow; invitation?: string; warning?: string}>(`/api/admin/${key}${create ? "" : `/${encodeURIComponent(row.id)}`}`, {method: create ? "POST" : "PATCH", body: JSON.stringify(row)}); setData(current => ({...current, [key]: create ? [result.row, ...current[key]] : current[key].map(item => item.id === row.id ? result.row : item)})); setEditor(null); if (key === "notifications" && _message === "send") await api(`/api/admin/notifications/${encodeURIComponent(result.row.id)}/send`, {method: "POST", body: "{}"}); setToast(result.warning || (result.invitation ? `Account invitation (valid 24 hours): ${window.location.origin}${result.invitation}` : "Changes saved."));}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to save. Your edits are still open."); throw error;} finally {setBusy(false);}
  }
  async function removeRecord(target: {key: string; row: AdminRow} | null = editor) {
    if (!target || busy) return; setBusy(true);
    try {await api(`/api/admin/${target.key}/${encodeURIComponent(target.row.id)}`, {method: "DELETE", body: JSON.stringify({version: Number(target.row._version)})}); setData(current => ({...current, [target.key]: current[target.key].filter(row => row.id !== target.row.id)})); setEditor(current => current?.key === target.key && current.row.id === target.row.id ? null : current); setToast("Record removed.");}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to remove this record."); throw error;} finally {setBusy(false);}
  }
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {const result = await api<{settings: typeof initialCompany}>("/api/admin/settings", {method: "PUT", body: JSON.stringify(settings)}); setSettings(result.settings); setSavedSettings(result.settings); setSettingsPanel(null); setToast("Company settings saved.");}
    catch (error) {setToast(error instanceof Error ? error.message : "Unable to save settings.");} finally {setBusy(false);}
  }
  useEffect(() => {let active = true; const timer = setInterval(async () => {if (document.hidden) return; try {const result = await api<Snapshot>("/api/admin"); if (active) setData(result.data);} catch { /* Keep the last successful snapshot while disconnected. */ }}, 5000); return () => {active = false; clearInterval(timer);};}, []);
  function add(key:string,singular?:string) {const row:AdminRow={id:"NEW"};modules[key].fields.forEach(field=>{row[field.key]=field.options?.[0]||"";});setEditor({key,row,singular});}
  function exportRows(key:string,rows:AdminRow[]) {if(!rows.length){setToast("No rows match your filters.");return;}setExportData({name:key,title:modules[key]?.title || "Booking report",rows:rows.map(row=>({...row}))});}
  function rowActions(key:string,row:AdminRow) {
    return <div style={{display:"flex", flexDirection:"column", alignItems:"flex-start", gap:6}}>
      <button type="button" className="adm-row-action" onClick={() => setEditor({key,row})} aria-label={`Manage ${row.name || row.id}`}>Manage <span aria-hidden="true">↗</span></button>
    </div>;
  }
  function table(key:string,rows:AdminRow[]) {
    const definition=modules[key];
    if (key === "vehicles") return <div className="adm-table-scroll"><table className="adm-table"><thead><tr>{["Image", "Vehicles", "Vehicle number", "Passenger capacity", "Luggage capacity", "Status", "Manage"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td>{row.image ? <img src={photo(row.image, 160)} alt={row.name || "Vehicle"} width={80} height={56} loading="lazy" style={{objectFit:"contain", borderRadius:8}}/> : "—"}</td>
      <td title={row.name}>{row.name || "—"}</td>
      <td title={row.plate}>{row.plate || "—"}</td>
      <td>{row.passengers || "—"}</td>
      <td>{row.luggage || "—"}</td>
      <td><Badge value={row.status || "Draft"}/></td>
      <td>{rowActions(key,row)}</td>
    </tr>)}</tbody></table>{!rows.length && <div className="adm-empty"><AdminIcon name="search" size={30}/><h3>No records found</h3><p>Try a different search or add your first record.</p></div>}</div>;
    return <div className={`adm-table-scroll ${key === "customers" ? "adm-customers-table" : ""}`}><table className="adm-table"><thead><tr>{definition.columns.map(column=><th scope="col" key={column}>{definition.fields.find(field=>field.key===column)?.label.replace(" (KSA)","").replace(" (SAR)","")||(column === "priceRange" ? "Price range (SAR)" : column === "route" ? "Route" : column)}</th>)}<th scope="col">Manage</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{definition.columns.map(column=><td key={column} title={column==="serviceId"?data.serviceCategories?.find(service=>service.id===row.serviceId)?.name||"Unassigned":column==="serviceIds"?selectedServiceIds(row.serviceIds).map(id=>data.serviceCategories?.find(service=>service.id===id)?.name||"Unavailable service").join(", "):column==="vehicleId"?data.vehicles.find(vehicle=>vehicle.id===row.vehicleId)?.name:column==="vehicle"&&key==="drivers"?data.vehicles.find(vehicle=>vehicle.id===row.vehicle||vehicle.name===row.vehicle)?.name||row.vehicle:column==="date"?`${row.date} ${row.time} KSA`:row[column]} className={["description","terms","serviceIds"].includes(column) ? "adm-location-description" : undefined}>{column==="serviceId"&&key==="fares"?(data.serviceCategories?.find(service=>service.id===row.serviceId)?.name || (row.serviceId ? "Unavailable service" : "Unassigned")):column==="image"?(row.image ? <span className="adm-location-photo"><Image src={photo(row.image,160)} alt={row.name || (key === "offers" ? "Offer vehicle" : "Location")} width={80} height={48} style={{objectFit:"cover",borderRadius:8}}/></span> : "—"):column==="serviceIds"&&key==="locations"?(selectedServiceIds(row.serviceIds).map(id=>data.serviceCategories?.find(service=>service.id===id)?.name || "Unavailable service").join(", ") || "Unassigned"):column==="vehicle"&&key==="drivers"?(data.vehicles.find(vehicle=>vehicle.id===row.vehicle || vehicle.name===row.vehicle)?.name || row.vehicle || "Unassigned"):column==="isSample"?(row.isSample === "true" ? "Sample" : "Customer"):column==="featured"?(row.featured === "true" ? "Featured" : "Not featured"):column==="priceRange"?row.priceRange||"Quote required":column==="vehicleId"?(data.vehicles.find(vehicle => vehicle.id === row.vehicleId)?.name || "Vehicle unavailable"):column==="status"?<Badge value={row[column]||"Draft"}/>:column==="customer"||column==="name"?<span className="adm-person"><span className="adm-avatar">{row[column]?.split(" ").map(part=>part[0]).slice(0,2).join("")}</span><span className="adm-cell-text">{row[column]}</span></span>:["fare","amount","hourly","waiting"].includes(column)?currency(row[column]):column==="discount"?`${row[column]}%`:column==="date"?<span>{row.date}<small className="adm-cell-sub">{row.time} KSA</small></span>:row[column]||"—"}</td>)}<td>{rowActions(key,row)}</td></tr>)}</tbody></table>{!rows.length&&<div className="adm-empty"><AdminIcon name="search" size={30}/><h3>No records found</h3><p>Try a different search or add your first record.</p></div>}</div>;
  }
  return <div className="admin-app">
    <a className="adm-skip" href="#admin-main">Skip to dashboard content</a>
    {menu&&<button className="adm-scrim" onClick={()=>setMenu(false)} aria-label="Close sidebar"/>}
    <aside className={`adm-sidebar ${menu?"is-open":""}`} id="admin-navigation">
      <Link className="adm-brand" href={adminSectionPath("overview")} aria-label="Falak Rides admin dashboard"><BrandLogo size={40}/></Link>
      <nav aria-label="Admin navigation"><div className="adm-nav-group">{groups.flatMap(group=>group.items).filter(([key]) => key === "overview" || canAccess(initial.user.role, key)).map(([key,label,icon])=><Fragment key={key}><Link href={adminSectionPath(key)} className={section===key?"active":""} aria-current={section===key?"page":undefined} onClick={event=>{if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;event.preventDefault();navigate(key);}}><AdminIcon name={icon}/><span>{label}</span>{key==="bookings"&&pending>0&&<small>{pending}</small>}</Link></Fragment>)}</div>
      <div className="adm-sidebar-bottom">
        <button type="button" className="adm-sidebar-logout" disabled={loggingOut} onClick={logout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4"/></svg>
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
        {logoutError && <p className="adm-sidebar-logout-error" role="alert">{logoutError}</p>}
      </div>
      </nav>
    </aside>
    <div className="adm-work-area">
      <header className="adm-topbar"><div className="adm-breadcrumb"><button className="adm-icon-button adm-mobile-menu" aria-expanded={menu} aria-controls="admin-navigation" onClick={()=>setMenu(!menu)} aria-label="Toggle admin navigation"><AdminIcon name="menu"/></button><span>Workspace</span><span>/</span><strong>{heading}</strong></div><div className="adm-topbar-right"><form className="adm-global-search" role="search" onSubmit={event=>{event.preventDefault();navigate("bookings");setSearch(globalSearch);}}><span className="adm-global-search-icon"><AdminIcon name="search" size={18}/></span><input aria-label="Search bookings" placeholder="Search bookings..." value={globalSearch} onChange={event=>setGlobalSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Escape")setGlobalSearch("");}}/>{globalSearch&&<button className="adm-global-search-clear app-x-button" type="button" aria-label="Clear search" onClick={()=>setGlobalSearch("")}><AdminIcon name="close" size={15}/></button>}<button className="adm-global-search-submit" type="submit" aria-label="Search bookings"><span>Search</span><Icon name="arrow" size={15}/></button></form><NotificationCenter initialState={initial.notices} bookings={bookings} notifications={data.notifications} onOpen={(key,row)=>{if(key!=="notifications")navigate(key);setEditor({key,row});}}/><AdminProfile onNavigate={navigate}/></div></header>
      <main id="admin-main" className="adm-main">
        <div className={`adm-page-title ${section === "content" ? "cms-sticky-heading" : ""}`}><div><span className="adm-overline">FALAK RIDES / ADMIN</span><h1>{section==="overview"?"A clear view of your journeys.":heading}</h1><p>{section==="overview"?"Welcome back. Here’s your operations snapshot.":activeModule?.description|| (section==="reports"?"Turn your booking data into a useful report.":section === "services" ? "Manage your services and their public pages." : section === "content" ? "Edit your website, save a draft and publish when ready." : "Company details and workspace preferences.")}</p></div><div ref={section==="content"?setContentActionsTarget:section==="services"?setServicesActionsTarget:undefined} className={`adm-page-actions ${section==="content"?"cms-page-actions":""}`}>{section==="overview"?<><button className="adm-button secondary" onClick={()=>exportRows("bookings",bookings)}><AdminIcon name="download" size={17}/> Export report</button><button className="adm-button" disabled={!canAccess(initial.user.role, "bookings", true)} onClick={()=>add("bookings")}><AdminIcon name="plus" size={18}/> New booking</button></>:activeModule&&<>{section==="customers"&&<button className="adm-button secondary" disabled={!canAccess(initial.user.role, "customers", true)} onClick={()=>setCustomerImport(true)}>Import spreadsheet</button>}<button className="adm-button secondary" onClick={()=>exportRows(section,filtered)}><AdminIcon name="download" size={17}/> Export</button>{section === "offers" && <button type="button" className="adm-button secondary" disabled={!canAccess(initial.user.role, "offers", true)} onClick={()=>add("offers","package")}><AdminIcon name="plus" size={18}/> Package</button>}<button className="adm-button" disabled={!canAccess(initial.user.role, section, true)} onClick={()=>add(section)}><AdminIcon name="plus" size={18}/> Add {activeModule.singular}</button></>}</div></div>
        {canAccess(initial.user.role, "content", true) && <div hidden={section!=="content"}><WebsiteContent actionsTarget={contentActionsTarget}/></div>}
        {section==="services"?<ServicesManager actionsTarget={servicesActionsTarget}/>:section==="content"?null:section==="overview"?<>
          <div className="adm-stat-grid">{[{label:"Total bookings",value:String(bookings.length),icon:"car",detail:"Booking records",tone:"mint"},{label:"Recorded revenue",value:currency(paid),icon:"bag",detail:"Paid transactions",tone:"sand"},{label:"Pending requests",value:String(pending),icon:"clock",detail:"Ready for your review",tone:"blue"},{label:"Available drivers",value:String(data.drivers.filter(row=>row.status==="Available").length),icon:"user",detail:`${data.drivers.length} drivers in your fleet`,tone:"lilac"}].map(stat=><article className={`adm-stat ${stat.tone}`} key={stat.label}><div><span>{stat.label}</span><span className="adm-stat-icon"><AdminIcon name={stat.icon}/></span></div><strong>{stat.value}</strong><small>{stat.label==="Pending requests"&&<span className="adm-small-dot"/>}{stat.detail}</small></article>)}</div>
          <div className="adm-analytics-grid"><section className="adm-panel"><div className="adm-panel-head"><div><h2>Revenue overview</h2><p>Recorded revenue · SAR</p></div><select aria-label="Revenue chart period" value={chartPeriod} onChange={event=>setChartPeriod(event.target.value)}><option>7 days</option><option>30 days</option></select></div><div className="adm-chart-summary"><strong>{currency(revenue.total)}</strong><span>Paid transactions in the selected period</span></div><div className="adm-chart"><div className="adm-chart-y">{revenue.ticks.map(tick => <span key={tick}>{tick}</span>)}</div><div className="adm-chart-plot"><svg viewBox="0 0 640 180" role="img" aria-label={`Recorded revenue for ${chartPeriod}`} preserveAspectRatio="none"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--adm-green)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--adm-green)" stopOpacity="0"/></linearGradient></defs>{[10,50,90,130,170].map(y=><line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#edf0eb" strokeDasharray="4 4"/>)}<path d={revenue.fill} fill="url(#revenue-fill)"/><path d={revenue.path} fill="none" stroke="var(--adm-green)" strokeWidth="3"/></svg><div className="adm-chart-x">{revenue.labels.map(day=><span key={day}>{day}</span>)}</div></div></div></section>
          <section className="adm-panel"><div className="adm-panel-head"><div><h2>Booking status</h2><p>Current records</p></div><Icon name="car" size={20}/></div><div className="adm-donut" style={{background:bookingGradient(bookings)}}><div><strong>{bookings.length}</strong><span>Total bookings</span></div></div><div className="adm-status-legend">{bookingStatuses.map(value=><div key={value}><span><i className={value.toLowerCase()}/>{value}</span><strong>{bookings.filter(row=>row.status===value).length}</strong></div>)}</div></section></div>
          <section className="adm-panel adm-recent"><div className="adm-panel-head"><div><h2>Recent bookings <span className="adm-count">{bookings.length}</span></h2><p>Your latest journeys at a glance.</p></div><button className="adm-text-button" onClick={()=>navigate("bookings")}>View all bookings <Icon size={16}/></button></div>{table("bookings",bookings.slice(0,5))}</section>
          <div className="adm-bottom-grid"><section className="adm-panel"><div className="adm-panel-head"><div><h2>Driver availability</h2><p>A little clarity for your next assignment.</p></div><button className="adm-text-button" onClick={()=>navigate("drivers")}>Manage <Icon size={16}/></button></div>{data.drivers.slice(0,3).map(driver=><button className="adm-driver-row" key={driver.id} onClick={()=>setEditor({key:"drivers",row:driver})}><span className="adm-avatar">{driver.name.split(" ").map(n=>n[0]).join("")}</span><span><strong>{driver.name}</strong><small>{driver.city} · {data.vehicles.find(vehicle=>vehicle.id===driver.vehicle || vehicle.name===driver.vehicle)?.name || driver.vehicle || "Unassigned"}</small></span><Badge value={driver.status}/></button>)}</section><section className="adm-next-step"><span className="adm-stat-icon"><Icon name="clock"/></span><h2>A smoother day starts<br/>with a clear schedule.</h2><p>{pending} requests are waiting for review. Check the route, assign a driver and plan the next journey.</p><button className="adm-button" onClick={()=>{navigate("bookings");setStatus("Pending");}}>Review pending requests <Icon size={17}/></button></section></div>
        </>:activeModule?<>
          {section==="roles"&&<div className="adm-info-note"><Icon name="shield" size={19}/><span><strong>Workspace roles.</strong> Administrator: all modules. Dispatcher: bookings and operations. Finance: payments and reports. Viewer: read only. Permissions are enforced for every request.</span></div>}
          <section className="adm-panel"><div className="adm-table-toolbar"><div className="adm-search"><AdminIcon name="search" size={18}/><input aria-label={`Search ${activeModule.title}`} placeholder={`Search ${activeModule.title.toLowerCase()}...`} value={search} onChange={event=>setSearch(event.target.value)}/></div><div>{activeModule.fields.some(field=>field.key==="status")&&<select aria-label="Filter by status" value={status} onChange={event=>setStatus(event.target.value)}><option>All statuses</option>{Array.from(new Set(data[section].map(row=>row.status).filter(Boolean))).map(value=><option key={value}>{value}</option>)}</select>}{section==="bookings"&&<select aria-label="Filter booking date" value={dateFilter} onChange={event=>setDateFilter(event.target.value)}><option>All dates</option><option>Today</option></select>}</div></div>{table(section,filtered)}<div className="adm-table-footer">Showing {filtered.length} of {data[section].length} records<span>Changes are saved to your workspace.</span></div></section>
        </>:section==="reports"?<section className="adm-panel adm-report"><span className="adm-stat-icon"><AdminIcon name="chart" size={25}/></span><h2>Booking report</h2><p>Choose a pickup date range and export the current bookings in your preferred format.</p><div className="adm-report-filters"><label>From<input type="date" value={reportFrom} onChange={event=>setReportFrom(event.target.value)}/></label><label>Through<input type="date" min={reportFrom} value={reportTo} onChange={event=>setReportTo(event.target.value)}/></label><button className="adm-button" disabled={reportFrom>reportTo} onClick={()=>exportRows("booking-report",reportRows)}><AdminIcon name="download" size={18}/> Export report</button></div><div className="adm-report-stats"><div><small>Matching bookings</small><strong>{reportRows.length}</strong></div><div><small>Completed fare total</small><strong>{currency(reportRows.filter(row=>row.status==="Completed").reduce((sum,row)=>sum+Number(row.fare||0),0))}</strong></div><div><small>Pending requests</small><strong>{reportRows.filter(row=>row.status==="Pending").length}</strong></div></div>{table("bookings",reportRows)}</section>:<SettingsCards onOpen={setSettingsPanel}/>}
      </main>
    </div>
    {section === "settings" && settingsPanel && <SettingsDialog title={settingsPanel === "company" ? "Company information" : "Password & security"} description={settingsPanel === "company" ? "Manage your business details." : "Update the password for your administrator account."} busy={busy || passwordBusy} onClose={()=>confirmNavigation(()=>setSettingsPanel(null))}>
      {settingsPanel === "company" ? <CompanySettings values={settings} onChange={patch=>setSettings({...settings,...patch})} onSubmit={saveSettings} busy={busy}/> : <PasswordSettings embedded onBusyChange={setPasswordBusy}/>}
    </SettingsDialog>}
    {editor&&<RecordDialog onBookingUpdated={row => {setData(current => ({...current,bookings:current.bookings.map(item => item.id === row.id ? row : item)}));setEditor({key:"bookings",row});}} canCreateCategories={initial.user.role === "Administrator"} editable={canAccess(initial.user.role, editor.key, true)} key={`${editor.key}-${editor.row.id}-${editor.singular || ""}`} moduleKey={editor.key} definition={editor.singular ? {...modules[editor.key],singular:editor.singular} : modules[editor.key]} record={editor.row} drivers={data.drivers} vehicles={data.vehicles} locations={data.locations || []} serviceCategories={data.serviceCategories || []} bookings={data.bookings || []} customers={data.customers || []} fares={data.fares || []} onClose={()=>setEditor(null)} onSave={row=>save(editor.key,row)} onAction={(row,message)=>save(editor.key,row,message)} onDelete={removeRecord}/>}
    {customerImport&&<CustomerImport onClose={()=>setCustomerImport(false)} onImported={message=>{setCustomerImport(false);setToast(message);setSearch("");void api<Snapshot>("/api/admin").then(result=>setData(result.data)).catch(()=>setToast(`${message} Refresh to see the latest customer list.`));}}/>}
    {exportData&&<ExportDialog data={exportData} onClose={()=>setExportData(null)}/>}
    {toast&&<div className="adm-toast" role="status"><Icon name="check" size={18}/>{toast}<button className="app-x-button" onClick={()=>setToast("")} aria-label="Dismiss notification"><AdminIcon name="close" size={16}/></button></div>}
    {confirmLogout && <ConfirmationDialog title="Log out?" description="Are you sure you want to log out of your account?" confirmLabel="Logout" onCancel={() => setConfirmLogout(false)} onConfirm={() => {setConfirmLogout(false); confirmNavigation(() => {void performLogout();});}}/>}
  </div>;
}
