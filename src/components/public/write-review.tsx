"use client";

import {useEffect, useRef, useState} from "react";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import "./write-review.css";

export default function WriteReview() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const confirmClose = useUnsavedChanges(dirty, () => {form.current?.reset(); setDirty(false);});
  function close() {
    if (busy) return;
    confirmClose(() => {dialog.current?.close(); setOpen(false);});
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const button = trigger.current;
    document.body.style.overflow = "hidden";
    return () => {document.body.style.overflow = previous; button?.focus({preventScroll:true});};
  }, [open]);
  return <>
    <button ref={trigger} type="button" className="taxi-write-review" aria-haspopup="dialog" onClick={() => {setError(""); setSuccess(""); setOpen(true); dialog.current?.showModal();}}>Write a review</button>
    <dialog ref={dialog} className="taxi-review-dialog" aria-labelledby="write-review-title" aria-describedby="write-review-description" onClose={() => setOpen(false)} onCancel={event => {event.preventDefault(); close();}}>
      <button type="button" className="taxi-review-close" aria-label="Close review form" disabled={busy} onClick={close}>&times;</button>
      <h2 id="write-review-title">Share your journey</h2>
      <p id="write-review-description">Tell us about your experience with Falak Rides. Reviews are checked by our team before appearing on the website.</p>
      {success ? <div role="status" className="taxi-review-success"><p>{success}</p><button type="button" className="taxi-button" onClick={close}>Done</button></div> : <form ref={form} onChange={() => setDirty(true)} onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        const fields = new FormData(event.currentTarget);
        setBusy(true); setError("");
        try {
          const response = await fetch("/api/reviews", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:fields.get("name"), rating:Number(fields.get("rating")), journey:fields.get("journey"), message:fields.get("message")})});
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Your review could not be sent. Please try again.");
          setDirty(false); setSuccess(result.message); form.current?.reset();
        } catch (error) {setError(error instanceof Error ? error.message : "Your review could not be sent. Please try again.");}
        finally {setBusy(false);}
      }}>
        <fieldset disabled={busy}>
          <label htmlFor="review-name">Your name<input id="review-name" name="name" autoComplete="name" required maxLength={80}/></label>
          <label htmlFor="review-rating">Your rating<select id="review-rating" name="rating" defaultValue="5" required><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
          <label htmlFor="review-journey">Journey / route (optional)<input id="review-journey" name="journey" maxLength={150} placeholder="For example, Jeddah Airport to Makkah"/></label>
          <label htmlFor="review-message">Your review<textarea id="review-message" name="message" required minLength={10} maxLength={1500} rows={4} placeholder="How was your journey?"/></label>
          {error && <p className="taxi-review-error" role="alert">{error}</p>}
          <button type="submit" className="taxi-button">{busy ? "Submitting…" : "Submit review"}</button>
        </fieldset>
      </form>}
    </dialog>
  </>;
}
