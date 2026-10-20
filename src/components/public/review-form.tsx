"use client";

import {useId, useRef, useState, type CSSProperties} from "react";
import {api} from "@/lib/api-client";
import {isDialogBackdropClick} from "@/lib/dialog-events";
import "./review-form.css";

function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"/></svg>;
}

export default function ReviewForm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const id = useId();

  function close() {dialog.current?.close();}
  function open() {
    if (submitting.current) return;
    form.current?.reset(); setError(""); setSuccess(""); setRating(0); setHoveredRating(0);
    dialog.current?.showModal();
  }

  return <div className="taxi-review-submit">
    <button ref={trigger} type="button" className="taxi-button" onClick={open}>Write a review</button>
    <dialog ref={dialog} className="taxi-review-dialog" aria-labelledby={`${id}-title`} onClose={() => trigger.current?.focus({preventScroll: true})} onClick={event => {if (isDialogBackdropClick(event)) close();}}>
      <button type="button" className="taxi-review-close app-x-button" aria-label="Close review form" onClick={close}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <div className="taxi-review-summary">
      <div className="taxi-review-heading-icon"><StarIcon/></div>
      <span className="taxi-review-eyebrow">Your experience matters</span>
      <h2 id={`${id}-title`}>Share your journey</h2>
      <p className="taxi-review-intro">A few words about your ride can help another traveller find their way.</p>
      </div>
      <div className="taxi-review-body">
      {success ? <p className="taxi-review-success" role="status">{success}</p> : <form ref={form} onSubmit={async event => {
        event.preventDefault();
        if (submitting.current) return;
        const fields = new FormData(event.currentTarget);
        submitting.current = true; setBusy(true); setError("");
        try {
          const result = await api<{message: string}>("/api/reviews", {method: "POST", body: JSON.stringify({name: fields.get("name"), rating: Number(fields.get("rating")), message: fields.get("message")})});
          form.current?.reset(); setSuccess(result.message);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Your review could not be submitted. Please try again.");
        } finally {submitting.current = false; setBusy(false);}
      }}>
        <fieldset disabled={busy}>
          <div className="taxi-review-rating">
            <span id={`${id}-rating`}>How was your experience?</span>
            <div className="taxi-review-stars-input" role="radiogroup" aria-labelledby={`${id}-rating`} onPointerLeave={() => setHoveredRating(0)}>
              {[1,2,3,4,5].map(value => <label key={value} className="taxi-review-star" data-filled={value <= (hoveredRating || rating)} style={{"--star-index": value} as CSSProperties} onPointerEnter={event => {if (event.pointerType === "mouse" && !busy) setHoveredRating(value);}}>
                <input type="radio" name="rating" value={value} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} checked={rating === value} onChange={() => {setRating(value); setHoveredRating(0);}} required/>
                <StarIcon/>
              </label>)}
            </div>
            <span className="taxi-review-rating-caption" aria-live="polite">{(hoveredRating || rating) ? ["", "Poor", "Fair", "Good", "Very good", "Excellent"][hoveredRating || rating] : "Tap a star to rate your ride"}</span>
          </div>
          <label className="taxi-review-field-label" htmlFor={`${id}-name`}>Your name</label>
          <input id={`${id}-name`} name="name" autoComplete="name" placeholder="How should we call you?" maxLength={80} required/>
          <label className="taxi-review-field-label" htmlFor={`${id}-message`}>Your review</label>
          <textarea id={`${id}-message`} name="message" placeholder="What made your journey memorable?" rows={4} maxLength={1500} required/>
          {error && <p className="taxi-review-error" role="alert">{error}</p>}
          <button type="submit" className="taxi-button taxi-review-send">{busy ? "Submitting…" : "Submit review"}<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
          <span className="taxi-review-moderation">Reviews are published after approval.</span>
        </fieldset>
      </form>}
      </div>
    </dialog>
  </div>;
}
