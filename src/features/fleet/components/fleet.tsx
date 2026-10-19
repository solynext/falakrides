"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";
import {ContentText} from "@/features/content/public-content";

import {useId, useRef, useState} from "react";
import Image from "next/image";
import {useSiteCatalog} from "@/features/content/public-content";
import {photo} from "@/utils/images";
import Icon from "@/components/ui/icon";
import "./fleet.css";

export default function Fleet() {
const {vehicles} = useSiteCatalog();

  const [filter, setFilter] = useState("All vehicles");
  const [selectedName, setSelectedName] = useState("");
  const selected = vehicles.find(vehicle => vehicle.name === selectedName);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectionTrigger = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  function close() {dialog.current?.close();}
  return <>
    <div className="filter-tabs">{["All vehicles", "Economy", "Premium", "Family", "Groups"].map(category => <button key={category} onClick={() => setFilter(category)} aria-pressed={filter === category} className={filter === category ? "active" : ""}>{category}</button>)}</div>
    <div className="fleet-grid minimal-fleet">
      {vehicles.filter(vehicle => filter === "All vehicles" || vehicle.category === filter).map(vehicle => <article className="vehicle-card" key={vehicle.name}>
        <div className="vehicle-image">{vehicle.image ? <Image src={photo(vehicle.image, 700)} alt={`${vehicle.name} illustrative vehicle photograph`} width={700} height={440} sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 25vw"/> : <Icon name="car" size={64}/>}</div>
        <div className="vehicle-info">
          <span className="fleet-category">{vehicle.category}</span>
          <h3>{vehicle.name}</h3>
          <div className="specs"><span><Icon name="user" size={16}/> <ContentText id="fleet.1" fallback=" Up to "/>{vehicle.passengers}</span><span><Icon name="bag" size={16}/> {vehicle.bags} <ContentText id="fleet.2" fallback=" bags"/></span></div>
          <div className="vehicle-bottom"><span><ContentText id="fleet.3" fallback="Fare in SAR"/></span><strong><ContentText id="fleet.4" fallback="On request"/></strong></div>
          <button type="button" className="fleet-select" onClick={event => {selectionTrigger.current = event.currentTarget; setSelectedName(vehicle.name); dialog.current?.showModal();}} aria-label={`Select ${vehicle.name}`}><ContentText id="fleet.5" fallback="Select vehicle "/><Icon size={18}/></button>
        </div>
      </article>)}
    </div>
    <p className="disclosure"><ContentText id="fleet.6" fallback="Illustrative fleet. Images, capacities and categories are examples, not confirmed inventory. Ask about GMC, Honda Civic and other preferences when booking."/></p>
    <dialog ref={dialog} className="fleet-detail" aria-labelledby={titleId} onClose={() => {if (!document.querySelector("dialog[open]")) selectionTrigger.current?.focus({preventScroll: true});}} onClick={event => {if (isDialogBackdropClick(event)) close();}}>
      <button className="fleet-detail-close app-x-button" type="button" onClick={close} aria-label="Close vehicle details">×</button>
      {selected ? <><div className="fleet-detail-photo">{selected.image ? <Image src={photo(selected.image, 900)} alt={selected.name} width={900} height={600} sizes="(max-width: 700px) 90vw, 420px"/> : <Icon name="car" size={80}/>}<span>{selected.category}</span></div><div className="fleet-detail-body"><span className="eyebrow"><ContentText id="ui.features-fleet-components-fleet.1" fallback="YOUR KIND OF COMFORT"/></span><h2 id={titleId}>{selected.name}</h2><p>{selected.description}</p><div className="fleet-detail-capacity"><span><Icon name="user" size={20}/><strong><ContentText id="ui.features-fleet-components-fleet.2" fallback="Up to "/>{selected.passengers}</strong><small><ContentText id="ui.features-fleet-components-fleet.3" fallback="passengers"/></small></span><span><Icon name="bag" size={20}/><strong>{selected.bags}{" "}<ContentText id="ui.features-fleet-components-fleet.4" fallback="bags"/></strong><small><ContentText id="ui.features-fleet-components-fleet.5" fallback="luggage capacity"/></small></span></div><div className="fleet-detail-fare"><span><ContentText id="ui.features-fleet-components-fleet.6" fallback="Fare in SAR"/></span><strong><ContentText id="ui.features-fleet-components-fleet.7" fallback="On request"/></strong></div><p className="fleet-detail-note"><ContentText id="ui.features-fleet-components-fleet.8" fallback="Add your route to check the published fare. Our team confirms the final vehicle, luggage fit, and availability."/></p><button className="button fleet-detail-continue" type="button" onClick={() => {close(); window.dispatchEvent(new CustomEvent("falak:book-vehicle", {detail: selected.name}));}}><ContentText id="ui.features-fleet-components-fleet.9" fallback="Continue with this vehicle"/><Icon size={18}/></button><button className="fleet-detail-back" type="button" onClick={close}><ContentText id="ui.features-fleet-components-fleet.10" fallback="Explore other vehicles"/></button></div></> : <div className="fleet-detail-body"><h2 id={titleId}><ContentText id="ui.features-fleet-components-fleet.11" fallback="Vehicle unavailable"/></h2><p><ContentText id="ui.features-fleet-components-fleet.12" fallback="This vehicle is no longer listed. Please choose another option."/></p><button className="button" type="button" onClick={close}><ContentText id="ui.features-fleet-components-fleet.13" fallback="Back to vehicles"/></button></div>}
    </dialog>
  </>;
}
