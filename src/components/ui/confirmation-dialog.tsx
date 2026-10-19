"use client";

import {useEffect, useId, useRef} from "react";
import {isDialogBackdropClick} from "@/lib/dialog-events";
import "./confirmation-dialog.css";

export default function ConfirmationDialog({title, description, confirmLabel, onConfirm, onCancel}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => {element?.close(); previousFocus.current?.focus({preventScroll: true});};
  }, []);

  function cancel() {dialog.current?.close(); onCancel();}
  function confirm() {
    // Release the modal before an action opens another confirmation.
    dialog.current?.close();
    onConfirm();
  }

  return <dialog ref={dialog} className="app-confirm" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => {event.preventDefault(); cancel();}} onClick={event => {if (isDialogBackdropClick(event)) cancel();}}>
    <button type="button" className="app-confirm-close app-x-button" aria-label="Close confirmation" onClick={cancel}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    <div className="app-confirm-body">
      <div className="app-confirm-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M10 12h11m-4-4 4 4-4 4"/></svg></div>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
    </div>
    <div className="app-confirm-actions"><button type="button" className="app-confirm-cancel" autoFocus onClick={cancel}>Cancel</button><button type="button" className="app-confirm-submit" onClick={confirm}>{confirmLabel}</button></div>
  </dialog>;
}
