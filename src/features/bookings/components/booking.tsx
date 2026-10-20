"use client";

import {useId, useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import {useSiteCatalog, useSiteContact} from "@/features/content/public-content";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import "./booking.css";
import DatePicker from "./date-picker";
import {api} from "@/lib/api-client";

type Details = {name: string; email: string; phone: string; pickup: string; destination: string; date: string; time: string; returnDate: string; returnTime: string; vehicle: string; passengers: string; luggage: string; address: string; notes: string; roundTrip: boolean};


export default function Booking({preference}: {preference?: {vehicle?: string; package?: string;pickup?:string}} = {}) {
  const {vehicles, locations} = useSiteCatalog();
  const {whatsapp} = useSiteContact();
  const initial: Details = {name: "", email: "", phone: "", pickup: locations.find(location=>location===preference?.pickup)||"", destination: "", date: "", time: "", returnDate: "", returnTime: "", vehicle: vehicles.find(item => item.name.toLowerCase() === preference?.vehicle?.toLowerCase())?.name || "", passengers: "1", luggage: "1", address: "", notes: [preference?.package ? `Requested package: ${preference.package}` : "", preference?.vehicle && !vehicles.some(item => item.name.toLowerCase() === preference.vehicle?.toLowerCase()) ? `Requested vehicle: ${preference.vehicle}` : ""].filter(Boolean).join("\n"), roundTrip: false};
  const [details, setDetails] = useState<Details>(initial);
  const [dirty, setDirty] = useState(Boolean(preference?.vehicle || preference?.package || preference?.pickup));
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const pending = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const summary = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const listId = useId();
  useUnsavedChanges(dirty, () => {setDetails(initial); setDirty(false); setPreview(false); setError("");});
  const today = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
  const vehicle = vehicles.find(item => item.name === details.vehicle);
  const choices = [...new Set([...locations, "Makkah", "Madinah", "Jeddah", "Jeddah Airport (JED)", "Madinah Airport (MED)"])];
  function update<K extends keyof Details>(key: K, value: Details[K]) {setDetails(current => ({...current, [key]: value})); setDirty(true); setPreview(false); setError(""); setStatus(""); setReference(""); idempotencyKey.current = null;}
  function validate() {
    if (!details.name.trim()) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) return "Enter a valid email address for your booking confirmation.";
    if (details.phone.replace(/\D/g, "").length < 8) return "Enter a valid phone number including country code.";
    if (!details.pickup.trim() || !details.destination.trim()) return "Add your pickup and drop-off locations.";
    if (details.pickup.trim().toLowerCase() === details.destination.trim().toLowerCase()) return "Choose different pickup and drop-off locations.";
    const pickup = new Date(`${details.date}T${details.time}:00+03:00`).getTime();
    if (!Number.isFinite(pickup) || pickup <= Date.now()) return "Choose a future pickup date and time in Saudi Arabia time.";
    if (details.roundTrip) {
      const returning = new Date(`${details.returnDate}T${details.returnTime}:00+03:00`).getTime();
      if (!Number.isFinite(returning) || returning <= pickup) return "Choose a return date and time after your pickup.";
    }
    if (!vehicle) return "Please choose a vehicle.";
    if (Number(details.passengers) > vehicle.passengers || Number(details.luggage) > vehicle.bags) return "Choose a larger vehicle or reduce the passenger and luggage counts to fit your selected vehicle.";
    return "";
  }
  const when = details.date && details.time ? `${details.date} at ${details.time} (KSA)` : "Not selected";
  const returning = details.roundTrip ? details.returnDate && details.returnTime ? `${details.returnDate} at ${details.returnTime} (KSA)` : "Not selected" : "One way";
  const message = ["Hello Falak Rides, I would like to request a booking.", "", `Name: ${details.name.trim()}`, `Phone: ${details.phone.trim()}`, `Email: ${details.email.trim()}`, `Pickup: ${details.pickup.trim()}`, `Drop-off: ${details.destination.trim()}`, `Pickup time: ${when}`, `Return: ${returning}`, `Vehicle: ${details.vehicle}`, `Passengers: ${details.passengers}`, `Luggage: ${details.luggage}`, details.address.trim() ? `Pickup address: ${details.address.trim()}` : "", details.notes.trim() ? `Notes: ${details.notes.trim()}` : "", "", "Please confirm availability, the total fare in SAR, and the accepted payment method."].filter((line): line is string => typeof line === "string").join("\n");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const issue = validate();
    if (issue) {setError(issue); requestAnimationFrame(() => errorRef.current?.focus()); return;}
    setError(""); setPreview(true);
    const send = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "book";
    if (send) {
      if (reference) return;
      pending.current = true; setBusy(true);
      try {
        idempotencyKey.current ??= globalThis.crypto.randomUUID();
        const result = await api<{booking: {reference: string}}>("/api/bookings", {method: "POST", body: JSON.stringify({
          name: details.name, email: details.email, phone: details.phone, pickup: details.pickup, destination: details.destination,
          date: details.date, time: details.time, returnDate: details.roundTrip ? details.returnDate : "", returnTime: details.roundTrip ? details.returnTime : "",
          journey: details.roundTrip ? "round-trip" : "one-way", passengers: details.passengers, luggage: details.luggage, vehicle: details.vehicle,
          notes: [details.address.trim() ? `Pickup address: ${details.address.trim()}` : "", details.notes.trim()].filter(Boolean).join("\n"), idempotencyKey: idempotencyKey.current,
        })});
        setReference(result.booking.reference); setDirty(false);
        setStatus(`Booking ${result.booking.reference} submitted. We'll email your confirmation once our team confirms your ride.`);
      } catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to submit your booking. Please try again.");}
      finally {pending.current = false; setBusy(false);}
    } else {summary.current?.scrollIntoView({behavior: "instant", block: "nearest"}); summary.current?.focus({preventScroll: true});}
  }

  return <form className="falak-booking" onSubmit={submit} aria-busy={busy}><fieldset className="falak-booking-form-fields" disabled={busy}>
    <section className="falak-booking-details" aria-labelledby={`${listId}-details`}>
      <div className="falak-booking-section-heading"><span className="falak-booking-step">01</span><div><h3 id={`${listId}-details`}>Booking details</h3><p>Your plans, your pace. Tell us about your journey.</p></div><span className="falak-booking-timezone"><Icon name="clock" size={14}/>KSA time</span></div>
      <div className="falak-booking-grid">
        <label>Full name<input name="name" autoComplete="name" required maxLength={80} placeholder="Your full name" value={details.name} onChange={event => update("name", event.target.value)}/></label>
        <label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={25} placeholder="+966 5X XXX XXXX" value={details.phone} onChange={event => update("phone", event.target.value)}/></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={details.email} onChange={event => update("email", event.target.value)}/></label>
        <label>Pickup city / location<input name="pickup" list={listId} required maxLength={160} placeholder="Select or enter pickup" value={details.pickup} onChange={event => update("pickup", event.target.value)}/></label>
        <label>Drop-off city / location<input name="destination" list={listId} required maxLength={160} placeholder="Select or enter destination" value={details.destination} onChange={event => update("destination", event.target.value)}/></label>
        <DatePicker label="Pickup date" name="date" min={today} value={details.date} onChange={value => update("date", value)}/>
        <label>Pickup time<input name="time" type="time" required value={details.time} onChange={event => update("time", event.target.value)}/></label>
      </div>
      <datalist id={listId}>{choices.map(location => <option key={location} value={location}/>)}</datalist>
      <label className="falak-booking-return"><input type="checkbox" checked={details.roundTrip} onChange={event => update("roundTrip", event.target.checked)}/><span>Add a return journey<small>Plan your ride back, too.</small></span><Icon name="arrow" size={18}/></label>
      {details.roundTrip && <div className="falak-booking-grid falak-booking-return-fields"><DatePicker label="Return date" name="returnDate" min={details.date && details.date > today ? details.date : today} value={details.returnDate} onChange={value => update("returnDate", value)} returnJourney/><label>Return time<input name="returnTime" type="time" required value={details.returnTime} onChange={event => update("returnTime", event.target.value)}/></label></div>}
      <div className="falak-booking-grid falak-booking-vehicle-grid">
        <label>Vehicle preference<select name="vehicle" required value={details.vehicle} onChange={event => update("vehicle", event.target.value)}><option value="" disabled>Choose your vehicle</option>{vehicles.map(item => <option key={item.name} value={item.name}>{item.name} - up to {item.passengers} passengers</option>)}</select></label>
        <label>Passengers<select name="passengers" value={details.passengers} onChange={event => update("passengers", event.target.value)}>{Array.from({length: Math.max(1, ...vehicles.map(item => item.passengers))}, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
        <label>Luggage<select name="luggage" value={details.luggage} onChange={event => update("luggage", event.target.value)}>{Array.from({length: Math.max(1, ...vehicles.map(item => item.bags)) + 1}, (_, index) => <option key={index} value={index}>{index} {index === 1 ? "bag" : "bags"}</option>)}</select></label>
      </div>
      {vehicle && <p className="falak-booking-capacity"><Icon name="car" size={15}/>Up to {vehicle.passengers} passengers and {vehicle.bags} bags. Actual vehicle confirmed with your quote.</p>}
      <label className="falak-booking-wide">Pickup address <span>(optional)</span><input name="address" maxLength={250} placeholder="Hotel name, district or airport terminal" value={details.address} onChange={event => update("address", event.target.value)}/></label>
      <label className="falak-booking-wide">Notes <span>(optional)</span><textarea name="notes" rows={2} maxLength={600} placeholder="Flight number, extra stops or special requirements" value={details.notes} onChange={event => update("notes", event.target.value)}/></label>
      {error && <p className="falak-booking-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    </section>
    <aside className="falak-booking-summary" ref={summary} tabIndex={-1} aria-labelledby={`${listId}-summary`}>
      <span className="falak-booking-summary-kicker"><Icon name="shield" size={16}/>PRIVATE RIDES. PERSONAL CARE.</span>
      <div className="falak-booking-section-heading"><span className="falak-booking-step">02</span><div><h3 id={`${listId}-summary`}>Your booking summary</h3><p>{preview ? "Details checked. Ready for your confirmation." : "Review your details before sending."}</p></div></div>
      <div className="falak-booking-route"><div><i/><span><small>PICKUP</small><strong>{details.pickup || "Your starting point"}</strong></span></div><div><i/><span><small>DROP-OFF</small><strong>{details.destination || "Your destination"}</strong></span></div></div>
      <dl>{[["Name", details.name || "Not entered"], ["Phone", details.phone || "Not entered"], ["Email", details.email || "Not entered"], ["Pickup", when], ["Return", returning], ["Vehicle", details.vehicle || "Not selected"], ["Passengers / bags", `${details.passengers} / ${details.luggage}`], ...(details.address.trim() ? [["Pickup address", details.address]] : []), ...(details.notes.trim() ? [["Notes", details.notes]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="falak-booking-quote"><span>Total fare</span><strong>Get your quote <small>SAR</small></strong><p>Our team confirms availability and the full fare before confirming your ride.</p></div>
      <div className="falak-booking-actions"><button type="submit" name="action" value="preview" className="falak-booking-preview"><Icon name="file" size={17}/>Preview summary</button><button type="submit" name="action" value="book" className="falak-booking-send" disabled={busy || !!reference}><Icon name="calendar" size={20}/>{busy ? "Submitting..." : reference ? "Booking submitted" : "Book ride"}<Icon size={17}/></button></div>
      {status && <p role="status" className="falak-booking-status">{status}</p>}
      {reference && <a className="falak-booking-whatsapp" href={`${whatsapp}?text=${encodeURIComponent(`Booking reference: ${reference}\n${message}`)}`} target="_blank" rel="noopener noreferrer">Continue on WhatsApp</a>}
    </aside>
  </fieldset></form>;
}
